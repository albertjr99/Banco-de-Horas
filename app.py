"""
Sistema de Banco de Horas - IPAJM
Aplicação Flask com banco de dados, backup e autosave
"""

from flask import Flask, render_template, jsonify, request, send_file
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash, check_password_hash
import os
import shutil
import json
from pathlib import Path
import threading
import time
import secrets
import smtplib
from email.mime.text import MIMEText

# Configuração da aplicação
app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'ipajm-banco-horas-2025-secret-key')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///banco_horas.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JSON_AS_ASCII'] = False
app.config['BACKUP_FOLDER'] = 'backups'

# Inicializar extensões
db = SQLAlchemy(app)
CORS(app)

# Criar pasta de backups
os.makedirs(app.config['BACKUP_FOLDER'], exist_ok=True)

# ==================== MODELOS DO BANCO DE DADOS ====================

class Servidor(db.Model):
    """Modelo para servidores do IPAJM"""
    __tablename__ = 'servidores'
    
    id = db.Column(db.Integer, primary_key=True)
    nf = db.Column(db.String(20), unique=True, nullable=False, index=True)
    nome = db.Column(db.String(200), nullable=False)
    setor = db.Column(db.String(100), nullable=False)
    criado_em = db.Column(db.DateTime, default=datetime.utcnow)
    atualizado_em = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacionamento com dias trabalhados
    dias_trabalhados = db.relationship('DiaTrabalhado', backref='servidor', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'nf': self.nf,
            'nome': self.nome,
            'setor': self.setor,
            'criado_em': self.criado_em.isoformat() if self.criado_em else None,
            'atualizado_em': self.atualizado_em.isoformat() if self.atualizado_em else None
        }


class DiaTrabalhado(db.Model):
    """Modelo para registros de dias trabalhados"""
    __tablename__ = 'dias_trabalhados'
    
    id = db.Column(db.Integer, primary_key=True)
    nf = db.Column(db.String(20), db.ForeignKey('servidores.nf'), nullable=False, index=True)
    nome = db.Column(db.String(200), nullable=False)
    setor = db.Column(db.String(100), nullable=False)
    vinculo = db.Column(db.String(50))
    
    # Datas e horários
    dia_trabalhado = db.Column(db.Date)
    entrada = db.Column(db.String(5))  # HH:MM
    saida = db.Column(db.String(5))    # HH:MM
    h_trab = db.Column(db.String(5))   # HH:MM calculado
    
    # Horas de direito e prazo
    h_direito = db.Column(db.String(5))
    prazo_max = db.Column(db.Date)
    
    # Totalizações
    h_totais = db.Column(db.String(10))
    hora_dia = db.Column(db.String(5), default='08:00')  # Padrão IPAJM: 8h/dia
    dias_gozar = db.Column(db.String(20))
    dias_gozados = db.Column(db.String(200))  # Datas das folgas tiradas
    h_descontadas = db.Column(db.String(10))
    saldo = db.Column(db.String(10))
    
    # Observações (para número do processo E-Docs, etc.)
    observacao = db.Column(db.Text)
    
    # Metadados
    criado_em = db.Column(db.DateTime, default=datetime.utcnow)
    atualizado_em = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'nf': self.nf,
            'nome': self.nome,
            'setor': self.setor,
            'vinculo': self.vinculo,
            'dia_trabalhado': self.dia_trabalhado.isoformat() if self.dia_trabalhado else None,
            'entrada': self.entrada,
            'saida': self.saida,
            'h_trabalhada': self.h_trab,
            'h_direito': self.h_direito,
            'prazo_max': self.prazo_max.isoformat() if self.prazo_max else None,
            'h_totais': self.h_totais,
            'hora_dia': self.hora_dia or '08:00',
            'dias_gozar': self.dias_gozar,
            'dias_gozados': self.dias_gozados,
            'horas_descontadas': self.h_descontadas,
            'saldo': self.saldo,
            'observacao': self.observacao,
            'criado_em': self.criado_em.isoformat() if self.criado_em else None,
            'atualizado_em': self.atualizado_em.isoformat() if self.atualizado_em else None
        }


class UsuarioSistema(db.Model):
    """Usuários de autenticação do sistema"""
    __tablename__ = 'usuarios_sistema'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='user')  # admin | user
    email = db.Column(db.String(255), nullable=True)
    ativo = db.Column(db.Boolean, default=True)
    criado_em = db.Column(db.DateTime, default=datetime.utcnow)
    atualizado_em = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def set_password(self, raw_password):
        self.password_hash = generate_password_hash(raw_password)

    def check_password(self, raw_password):
        return check_password_hash(self.password_hash, raw_password)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'role': self.role,
            'email': self.email,
            'ativo': self.ativo
        }


class TokenRedefinicao(db.Model):
    """Tokens de redefinição de senha gerados pelo admin"""
    __tablename__ = 'tokens_redefinicao'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('usuarios_sistema.id'), nullable=False, index=True)
    token = db.Column(db.String(120), unique=True, nullable=False, index=True)
    expira_em = db.Column(db.DateTime, nullable=False)
    usado = db.Column(db.Boolean, default=False)
    criado_por = db.Column(db.String(80), nullable=True)
    criado_em = db.Column(db.DateTime, default=datetime.utcnow)


class LogEmailAlerta(db.Model):
    """Controle para evitar envio duplicado de e-mail de alerta no mesmo dia"""
    __tablename__ = 'log_email_alerta'

    id = db.Column(db.Integer, primary_key=True)
    registro_id = db.Column(db.Integer, db.ForeignKey('dias_trabalhados.id'), nullable=False, index=True)
    data_alerta = db.Column(db.Date, nullable=False, index=True)
    enviado_em = db.Column(db.DateTime, default=datetime.utcnow)


# ==================== FUNÇÕES DE BACKUP ====================

def calcular_diferenca_horas(entrada, saida):
    """Calcula diferença entre entrada e saída em formato HH:MM"""
    if not entrada or not saida or entrada == '-' or saida == '-':
        return '00:00'
    
    try:
        h1, m1 = map(int, entrada.split(':'))
        h2, m2 = map(int, saida.split(':'))
        
        total_min1 = h1 * 60 + m1
        total_min2 = h2 * 60 + m2
        
        if total_min2 < total_min1:
            total_min2 += 24 * 60
        
        diff = total_min2 - total_min1
        horas = diff // 60
        minutos = diff % 60
        
        return f"{horas:02d}:{minutos:02d}"
    except:
        return '00:00'


def calcular_prazo_maximo(dia_trabalhado):
    """Calcula prazo máximo de 6 meses após o dia trabalhado"""
    if not dia_trabalhado:
        return None
    
    try:
        if isinstance(dia_trabalhado, str):
            dia_trabalhado = datetime.fromisoformat(dia_trabalhado).date()
        
        # Adicionar 6 meses exatos
        from dateutil.relativedelta import relativedelta
        prazo = dia_trabalhado + relativedelta(months=6)
        return prazo
    except:
        # Fallback para 180 dias se dateutil não disponível
        try:
            return dia_trabalhado + timedelta(days=180)
        except:
            return None


def multiplicar_horas(hora_str, fator):
    """Multiplica uma hora no formato HH:MM por um fator"""
    if not hora_str or hora_str == '-':
        return '00:00'
    
    try:
        h, m = map(int, hora_str.split(':'))
        total_min = (h * 60 + m) * fator
        horas = int(total_min // 60)
        minutos = int(total_min % 60)
        return f"{horas:02d}:{minutos:02d}"
    except:
        return '00:00'


def somar_horas(lista_horas):
    """Soma uma lista de horas no formato HH:MM"""
    total_min = 0
    for hora in lista_horas:
        if hora and ':' in str(hora):
            try:
                h, m = map(int, str(hora).split(':'))
                total_min += h * 60 + m
            except:
                pass
    
    horas = total_min // 60
    minutos = total_min % 60
    return f"{horas:02d}:{minutos:02d}"


def subtrair_horas(hora1, hora2):
    """Subtrai hora2 de hora1 (hora1 - hora2)"""
    if not hora1:
        hora1 = '00:00'
    if not hora2:
        hora2 = '00:00'
    
    try:
        h1, m1 = map(int, hora1.split(':'))
        h2, m2 = map(int, hora2.split(':'))
        
        total1 = h1 * 60 + m1
        total2 = h2 * 60 + m2
        
        diff = total1 - total2
        sinal = '' if diff >= 0 else '-'
        diff = abs(diff)
        
        horas = diff // 60
        minutos = diff % 60
        return f"{sinal}{horas:02d}:{minutos:02d}"
    except:
        return '00:00'


def horas_para_dias(hora_str, horas_por_dia=8):
    """Converte horas para dias (baseado em 8h/dia padrão IPAJM)"""
    if not hora_str or hora_str == '-':
        return '0'
    
    try:
        h, m = map(int, hora_str.split(':'))
        total_horas = h + m / 60
        dias = total_horas / horas_por_dia
        return f"{dias:.1f}"
    except:
        return '0'


def criar_backup():
    """Cria backup do banco de dados"""
    try:
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_filename = f'backup_{timestamp}.db'
        backup_path = os.path.join(app.config['BACKUP_FOLDER'], backup_filename)
        
        # Copiar banco de dados
        db_path = 'banco_horas.db'
        if os.path.exists(db_path):
            shutil.copy2(db_path, backup_path)
            
            # Manter apenas os últimos 30 backups
            limpar_backups_antigos()
            
            return backup_path
    except Exception as e:
        print(f"Erro ao criar backup: {e}")
        return None


def limpar_backups_antigos(manter=30):
    """Remove backups antigos, mantendo apenas os N mais recentes"""
    try:
        backups = sorted(Path(app.config['BACKUP_FOLDER']).glob('backup_*.db'))
        if len(backups) > manter:
            for backup in backups[:-manter]:
                backup.unlink()
    except Exception as e:
        print(f"Erro ao limpar backups antigos: {e}")


def backup_automatico():
    """Thread para criar backups automáticos a cada 6 horas"""
    while True:
        time.sleep(6 * 60 * 60)  # 6 horas
        criar_backup()
        print(f"Backup automático criado em {datetime.now()}")




def semear_usuarios_iniciais():
    """Cria usuários iniciais do sistema, se não existirem."""
    usuarios = [
        ('admin', '260220', 'admin', None),
        ('Maria', '1234', 'user', 'maria.nery@ipajm.es.gov.br'),
        ('Sergio', '1234', 'user', 'sergio.silva@ipajm.es.gov.br'),
        ('Thiago', '1234', 'user', 'thiago.nunes@ipajm.es.gov.br'),
        ('Máira', '1234', 'user', 'maira.braga@ipajm.es.gov.br')
    ]

    for username, senha, role, email in usuarios:
        existente = UsuarioSistema.query.filter_by(username=username).first()
        if not existente:
            u = UsuarioSistema(username=username, role=role, email=email, ativo=True)
            u.set_password(senha)
            db.session.add(u)
    db.session.commit()


def verificar_admin_payload(data):
    """Valida credenciais de admin no payload."""
    username = (data or {}).get('admin_user')
    password = (data or {}).get('admin_password')
    if not username or not password:
        return None

    admin = UsuarioSistema.query.filter_by(username=username, role='admin', ativo=True).first()
    if admin and admin.check_password(password):
        return admin
    return None


def enviar_email_alerta(destinatario, servidor_nome, nf, prazo_max):
    """Envia e-mail real de alerta de prazo via SMTP."""
    smtp_host = os.environ.get('SMTP_HOST')
    smtp_port = int(os.environ.get('SMTP_PORT', '587'))
    smtp_user = os.environ.get('SMTP_USER')
    smtp_pass = os.environ.get('SMTP_PASS')
    smtp_from = os.environ.get('SMTP_FROM', smtp_user or 'noreply@ipajm.es.gov.br')

    if not smtp_host or not smtp_user or not smtp_pass:
        print('[EMAIL] SMTP não configurado. Defina SMTP_HOST, SMTP_PORT, SMTP_USER e SMTP_PASS.')
        return False

    assunto = f"[Banco de Horas] Alerta de prazo - {servidor_nome}"
    corpo = (
        f"Olá,\n\n"
        f"O servidor {servidor_nome} (NF {nf}) atingiu o marco de 30 dias para o prazo máximo "
        f"de uso do banco de horas (prazo máx.: {prazo_max}).\n\n"
        f"Atenção: acesse o sistema de Banco de Horas para verificar os detalhes e providências.\n\n"
        f"Mensagem automática do sistema."
    )

    msg = MIMEText(corpo, _charset='utf-8')
    msg['Subject'] = assunto
    msg['From'] = smtp_from
    msg['To'] = destinatario

    try:
        with smtplib.SMTP(smtp_host, smtp_port, timeout=20) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.sendmail(smtp_from, [destinatario], msg.as_string())
        return True
    except Exception as e:
        print(f'[EMAIL] Falha ao enviar e-mail para {destinatario}: {e}')
        return False


def processar_alertas_email_30_dias():
    """Verifica alertas de 30 dias e envia e-mail apenas uma vez por dia/registro."""
    hoje = datetime.utcnow().date()
    registros = DiaTrabalhado.query.filter(DiaTrabalhado.prazo_max.isnot(None)).all()

    usuarios_email = UsuarioSistema.query.filter(
        UsuarioSistema.role == 'user',
        UsuarioSistema.ativo == True,
        UsuarioSistema.email.isnot(None)
    ).all()
    emails_destino = [u.email for u in usuarios_email if u.email]

    if not emails_destino:
        return

    for r in registros:
        if not r.prazo_max:
            continue
        dias = (r.prazo_max - hoje).days
        if dias != 30:
            continue

        ja_enviado = LogEmailAlerta.query.filter_by(registro_id=r.id, data_alerta=hoje).first()
        if ja_enviado:
            continue

        servidor_nome = r.nome or 'Servidor'
        prazo_str = r.prazo_max.strftime('%d/%m/%Y') if r.prazo_max else '-'

        sucesso_geral = True
        for email in emails_destino:
            ok = enviar_email_alerta(email, servidor_nome, r.nf, prazo_str)
            sucesso_geral = sucesso_geral and ok

        if sucesso_geral:
            db.session.add(LogEmailAlerta(registro_id=r.id, data_alerta=hoje))
            db.session.commit()


def alerta_email_automatico():
    """Thread para checagem periódica de alertas por e-mail."""
    while True:
        try:
            with app.app_context():
                processar_alertas_email_30_dias()
        except Exception as e:
            print(f'Erro no alerta automático por e-mail: {e}')
        time.sleep(60 * 60)


# ==================== ROTAS DA API ====================

@app.route('/')
def index():
    """Página principal"""
    return render_template('index.html')




@app.route('/api/auth/login', methods=['POST'])
def auth_login():
    data = request.json or {}
    username = (data.get('username') or '').strip()
    password = data.get('password') or ''

    # Garantir usuários iniciais (útil em ambiente WSGI/deploy)
    semear_usuarios_iniciais()

    user = UsuarioSistema.query.filter_by(username=username, ativo=True).first()
    if not user or not user.check_password(password):
        return jsonify({'error': 'Usuário ou senha inválidos'}), 401

    return jsonify({
        'username': user.username,
        'role': user.role,
        'email': user.email
    })


@app.route('/api/auth/reset-password', methods=['POST'])
def auth_reset_password():
    data = request.json or {}
    username = (data.get('username') or '').strip()
    token = (data.get('token') or '').strip()
    nova_senha = (data.get('new_password') or '').strip()

    # Garantir usuários iniciais (útil em ambiente WSGI/deploy)
    semear_usuarios_iniciais()

    user = UsuarioSistema.query.filter_by(username=username, ativo=True).first()
    if not user:
        return jsonify({'error': 'Usuário não encontrado'}), 404

    token_obj = TokenRedefinicao.query.filter_by(user_id=user.id, token=token, usado=False).first()
    if not token_obj or token_obj.expira_em < datetime.utcnow():
        return jsonify({'error': 'Token inválido ou expirado'}), 400

    user.set_password(nova_senha)
    token_obj.usado = True
    db.session.commit()

    return jsonify({'message': 'Senha redefinida com sucesso'})


@app.route('/api/admin/users', methods=['POST'])
def admin_list_users():
    data = request.json or {}
    admin = verificar_admin_payload(data)
    if not admin:
        return jsonify({'error': 'Acesso negado'}), 403

    users = UsuarioSistema.query.order_by(UsuarioSistema.username).all()
    return jsonify([u.to_dict() for u in users])


@app.route('/api/admin/token', methods=['POST'])
def admin_generate_token():
    data = request.json or {}
    admin = verificar_admin_payload(data)
    if not admin:
        return jsonify({'error': 'Acesso negado'}), 403

    username = (data.get('username') or '').strip()
    # Garantir usuários iniciais (útil em ambiente WSGI/deploy)
    semear_usuarios_iniciais()

    user = UsuarioSistema.query.filter_by(username=username, ativo=True).first()
    if not user:
        return jsonify({'error': 'Usuário não encontrado'}), 404

    token = secrets.token_urlsafe(24)
    expira_em = datetime.utcnow() + timedelta(hours=24)

    token_obj = TokenRedefinicao(
        user_id=user.id,
        token=token,
        expira_em=expira_em,
        criado_por=admin.username
    )
    db.session.add(token_obj)
    db.session.commit()

    return jsonify({
        'username': user.username,
        'token': token,
        'expira_em': expira_em.isoformat()
    })


# ========== ROTAS DE SERVIDORES ==========

@app.route('/api/servidores', methods=['GET'])
def get_servidores():
    """Listar todos os servidores"""
    servidores = Servidor.query.order_by(Servidor.nome).all()
    return jsonify([s.to_dict() for s in servidores])


@app.route('/api/servidores/<nf>', methods=['GET'])
def get_servidor(nf):
    """Obter servidor por NF"""
    servidor = Servidor.query.filter_by(nf=nf).first()
    if servidor:
        return jsonify(servidor.to_dict())
    return jsonify({'error': 'Servidor não encontrado'}), 404


@app.route('/api/servidores', methods=['POST'])
def criar_servidor():
    """Criar novo servidor"""
    data = request.json
    
    # Verificar se NF já existe
    if Servidor.query.filter_by(nf=data['nf']).first():
        return jsonify({'error': 'NF já cadastrado'}), 400
    
    servidor = Servidor(
        nf=data['nf'],
        nome=data['nome'],
        setor=data['setor']
    )
    
    db.session.add(servidor)
    db.session.commit()
    
    return jsonify(servidor.to_dict()), 201


@app.route('/api/servidores/<int:id>', methods=['PUT'])
def atualizar_servidor(id):
    """Atualizar servidor"""
    servidor = Servidor.query.get_or_404(id)
    data = request.json
    
    servidor.nome = data.get('nome', servidor.nome)
    servidor.setor = data.get('setor', servidor.setor)
    servidor.atualizado_em = datetime.utcnow()
    
    db.session.commit()
    
    return jsonify(servidor.to_dict())


@app.route('/api/servidores/<int:id>', methods=['DELETE'])
def deletar_servidor(id):
    """Deletar servidor"""
    servidor = Servidor.query.get_or_404(id)
    db.session.delete(servidor)
    db.session.commit()
    
    return jsonify({'message': 'Servidor deletado com sucesso'}), 200


# ========== ROTAS DE DIAS TRABALHADOS ==========

@app.route('/api/dias-trabalhados', methods=['GET'])
def get_dias_trabalhados():
    """Listar todos os dias trabalhados"""
    registros = DiaTrabalhado.query.order_by(DiaTrabalhado.dia_trabalhado.desc()).all()
    return jsonify([r.to_dict() for r in registros])


@app.route('/api/dias-trabalhados/<int:id>', methods=['GET'])
def get_dia_trabalhado(id):
    """Obter dia trabalhado por ID"""
    registro = DiaTrabalhado.query.get_or_404(id)
    return jsonify(registro.to_dict())


@app.route('/api/dias-trabalhados/servidor/<nf>', methods=['GET'])
def get_dias_trabalhados_por_servidor(nf):
    """Listar dias trabalhados de um servidor"""
    registros = DiaTrabalhado.query.filter_by(nf=nf).order_by(DiaTrabalhado.dia_trabalhado.desc()).all()
    return jsonify([r.to_dict() for r in registros])


@app.route('/api/dias-trabalhados', methods=['POST'])
def criar_dia_trabalhado():
    """Criar novo registro de dia trabalhado"""
    data = request.json
    
    # Calcular horas trabalhadas se entrada e saída fornecidos
    h_trab = data.get('h_trabalhada')
    entrada = data.get('entrada')
    saida = data.get('saida')
    
    if not h_trab and entrada and saida:
        h_trab = calcular_diferenca_horas(entrada, saida)
    
    # Calcular horas de direito (2x as horas trabalhadas)
    h_direito = data.get('h_direito')
    if not h_direito and h_trab:
        h_direito = multiplicar_horas(h_trab, 2)
    
    # Data do dia trabalhado
    dia_trab = None
    if data.get('dia_trabalhado'):
        dia_trab = datetime.fromisoformat(data['dia_trabalhado']).date()
    
    # Calcular prazo máximo (6 meses após dia trabalhado)
    prazo_max = data.get('prazo_max')
    if not prazo_max and dia_trab:
        prazo_max = calcular_prazo_maximo(dia_trab)
    elif prazo_max:
        prazo_max = datetime.fromisoformat(prazo_max).date()
    
    registro = DiaTrabalhado(
        nf=data['nf'],
        nome=data.get('nome', ''),
        setor=data.get('setor', ''),
        vinculo=data.get('vinculo'),
        dia_trabalhado=dia_trab,
        entrada=entrada,
        saida=saida,
        h_trab=h_trab,
        h_direito=h_direito,
        prazo_max=prazo_max,
        h_totais=data.get('h_totais'),
        hora_dia=data.get('hora_dia', '08:00'),
        dias_gozar=data.get('dias_gozar'),
        dias_gozados=data.get('dias_gozados'),
        h_descontadas=data.get('horas_descontadas'),
        saldo=data.get('saldo'),
        observacao=data.get('observacao')
    )
    
    db.session.add(registro)
    db.session.commit()
    
    return jsonify(registro.to_dict()), 201


@app.route('/api/dias-trabalhados/<int:id>', methods=['PUT'])
def atualizar_dia_trabalhado(id):
    """Atualizar registro de dia trabalhado"""
    registro = DiaTrabalhado.query.get_or_404(id)
    data = request.json
    
    # Atualizar campos
    registro.nome = data.get('nome', registro.nome)
    registro.setor = data.get('setor', registro.setor)
    registro.vinculo = data.get('vinculo', registro.vinculo)
    
    # Dia trabalhado
    if data.get('dia_trabalhado'):
        if isinstance(data['dia_trabalhado'], str):
            registro.dia_trabalhado = datetime.fromisoformat(data['dia_trabalhado']).date()
        
        # Calcular prazo máximo automaticamente (6 meses)
        registro.prazo_max = calcular_prazo_maximo(registro.dia_trabalhado)
    
    # Entrada e saída
    if 'entrada' in data:
        registro.entrada = data['entrada']
    if 'saida' in data:
        registro.saida = data['saida']
    
    # Recalcular horas trabalhadas automaticamente
    if registro.entrada and registro.saida:
        registro.h_trab = calcular_diferenca_horas(registro.entrada, registro.saida)
        # Horas de direito = 2x horas trabalhadas
        registro.h_direito = multiplicar_horas(registro.h_trab, 2)
    else:
        if 'h_trabalhada' in data:
            registro.h_trab = data['h_trabalhada']
        if 'h_direito' in data:
            registro.h_direito = data['h_direito']
    
    # Prazo máximo manual (se fornecido explicitamente)
    if 'prazo_max' in data and data['prazo_max']:
        if isinstance(data['prazo_max'], str):
            registro.prazo_max = datetime.fromisoformat(data['prazo_max']).date()
    
    # Outros campos
    if 'h_totais' in data:
        registro.h_totais = data['h_totais']
    if 'hora_dia' in data:
        registro.hora_dia = data['hora_dia']
    if 'dias_gozar' in data:
        registro.dias_gozar = data['dias_gozar']
    if 'dias_gozados' in data:
        registro.dias_gozados = data['dias_gozados']
    if 'horas_descontadas' in data:
        registro.h_descontadas = data['horas_descontadas']
    if 'observacao' in data:
        registro.observacao = data['observacao']
    
    # Calcular saldo automaticamente: H.DIREITO - H.DESCONTADAS
    h_direito = registro.h_direito or '00:00'
    h_descontadas = registro.h_descontadas or '00:00'
    registro.saldo = subtrair_horas(h_direito, h_descontadas)
    
    registro.atualizado_em = datetime.utcnow()
    
    db.session.commit()
    
    return jsonify(registro.to_dict())


@app.route('/api/dias-trabalhados/<int:id>', methods=['DELETE'])
def deletar_dia_trabalhado(id):
    """Deletar registro de dia trabalhado"""
    registro = DiaTrabalhado.query.get_or_404(id)
    db.session.delete(registro)
    db.session.commit()
    
    return jsonify({'message': 'Registro deletado com sucesso'}), 200


# ========== ROTAS DE ESTATÍSTICAS ==========

@app.route('/api/estatisticas', methods=['GET'])
def get_estatisticas():
    """Obter estatísticas gerais do sistema"""
    total_servidores = Servidor.query.count()
    total_registros = DiaTrabalhado.query.count()
    
    # Calcular média de horas
    registros = DiaTrabalhado.query.filter(DiaTrabalhado.h_trab.isnot(None)).all()
    total_minutos = sum(time_to_minutes(r.h_trab) for r in registros if r.h_trab)
    media_horas = minutes_to_time(total_minutos // len(registros)) if registros else '00:00'
    
    # Total dias de folga
    total_dias_folga = 0
    for registro in DiaTrabalhado.query.filter(DiaTrabalhado.dias_gozar.isnot(None)).all():
        try:
            total_dias_folga += float(registro.dias_gozar)
        except:
            pass
    
    return jsonify({
        'totalServidores': total_servidores,
        'totalRegistros': total_registros,
        'mediaHoras': media_horas,
        'totalDiasFolga': round(total_dias_folga, 2)
    })




@app.route('/api/consulta/<nf>', methods=['GET'])
def consultar_servidor(nf):
    """Consulta rápida de servidor por NF (Gestão à Vista)"""
    servidor = Servidor.query.filter_by(nf=nf).first()
    if not servidor:
        return jsonify({'error': 'Servidor não encontrado'}), 404
    
    registros = DiaTrabalhado.query.filter_by(nf=nf).order_by(DiaTrabalhado.dia_trabalhado.desc()).all()
    
    # Calcular totais - Horas de Direito (que são 2x as trabalhadas)
    total_h_direito = 0
    total_h_descontadas = 0
    
    for reg in registros:
        if reg.h_direito:
            total_h_direito += time_to_minutes(reg.h_direito)
        if reg.h_descontadas:
            total_h_descontadas += time_to_minutes(reg.h_descontadas)
    
    # Saldo = Horas de Direito - Horas Descontadas
    saldo_minutos = total_h_direito - total_h_descontadas
    
    # Dias para gozar = Saldo / 8h (480 min)
    dias_gozar = saldo_minutos / 480 if saldo_minutos > 0 else 0
    
    return jsonify({
        'servidor': servidor.to_dict(),
        'horasDireito': minutes_to_time(total_h_direito),
        'horasDescontadas': minutes_to_time(total_h_descontadas),
        'saldo': minutes_to_time(abs(saldo_minutos)),
        'saldoNegativo': saldo_minutos < 0,
        'diasGozar': round(dias_gozar, 2),
        'horaDia': '08:00',
        'totalRegistros': len(registros),
        'registros': [r.to_dict() for r in registros]
    })


# ========== ROTAS DE BACKUP ==========

@app.route('/api/backup/criar', methods=['POST'])
def criar_backup_manual():
    """Criar backup manual"""
    backup_path = criar_backup()
    if backup_path:
        return jsonify({
            'message': 'Backup criado com sucesso',
            'arquivo': os.path.basename(backup_path)
        }), 201
    return jsonify({'error': 'Erro ao criar backup'}), 500


@app.route('/api/backup/listar', methods=['GET'])
def listar_backups():
    """Listar backups disponíveis"""
    backups = []
    for backup_file in sorted(Path(app.config['BACKUP_FOLDER']).glob('backup_*.db'), reverse=True):
        stat = backup_file.stat()
        backups.append({
            'arquivo': backup_file.name,
            'tamanho': stat.st_size,
            'criado_em': datetime.fromtimestamp(stat.st_mtime).isoformat()
        })
    return jsonify(backups)


@app.route('/api/backup/download/<filename>', methods=['GET'])
def download_backup(filename):
    """Download de backup"""
    backup_path = os.path.join(app.config['BACKUP_FOLDER'], filename)
    if os.path.exists(backup_path) and filename.startswith('backup_'):
        return send_file(backup_path, as_attachment=True)
    return jsonify({'error': 'Backup não encontrado'}), 404


# ========== ROTAS DE IMPORTAÇÃO/EXPORTAÇÃO ==========

@app.route('/api/exportar/json', methods=['GET'])
def exportar_json():
    """Exportar todos os dados para JSON"""
    servidores = Servidor.query.all()
    dias_trabalhados = DiaTrabalhado.query.all()
    
    data = {
        'servidores': [s.to_dict() for s in servidores],
        'diasTrabalhados': [d.to_dict() for d in dias_trabalhados],
        'exportado_em': datetime.now().isoformat()
    }
    
    return jsonify(data)


@app.route('/api/importar/json', methods=['POST'])
def importar_json():
    """Importar dados de JSON"""
    data = request.json
    
    try:
        # Importar servidores
        for servidor_data in data.get('servidores', []):
            if not Servidor.query.filter_by(nf=servidor_data['nf']).first():
                servidor = Servidor(
                    nf=servidor_data['nf'],
                    nome=servidor_data['nome'],
                    setor=servidor_data['setor']
                )
                db.session.add(servidor)
        
        # Importar dias trabalhados
        for dia_data in data.get('diasTrabalhados', []):
            registro = DiaTrabalhado(
                nf=dia_data['nf'],
                nome=dia_data['nome'],
                setor=dia_data['setor'],
                vinculo=dia_data.get('vinculo'),
                dia_trabalhado=datetime.fromisoformat(dia_data['diaTrabalho']).date() if dia_data.get('diaTrabalho') else None,
                entrada=dia_data.get('entrada'),
                saida=dia_data.get('saida'),
                h_trab=dia_data.get('hTrab'),
                h_direito=dia_data.get('hDireito'),
                prazo_max=datetime.fromisoformat(dia_data['prazoMax']).date() if dia_data.get('prazoMax') else None,
                h_totais=dia_data.get('hTotais'),
                hora_dia=dia_data.get('horaDia'),
                dias_gozar=dia_data.get('diasGozar'),
                dias_gozados=dia_data.get('diasGozados'),
                h_descontadas=dia_data.get('hDescontadas'),
                saldo=dia_data.get('saldo')
            )
            db.session.add(registro)
        
        db.session.commit()
        
        # Criar backup após importação
        criar_backup()
        
        return jsonify({'message': 'Dados importados com sucesso'}), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400


# ==================== FUNÇÕES AUXILIARES ====================

def calcular_horas_trabalhadas(entrada, saida):
    """Calcula horas trabalhadas entre entrada e saída"""
    try:
        h_entrada, m_entrada = map(int, entrada.split(':'))
        h_saida, m_saida = map(int, saida.split(':'))
        
        minutos_entrada = h_entrada * 60 + m_entrada
        minutos_saida = h_saida * 60 + m_saida
        
        if minutos_saida < minutos_entrada:
            minutos_saida += 24 * 60
        
        total_minutos = minutos_saida - minutos_entrada
        
        horas = total_minutos // 60
        minutos = total_minutos % 60
        
        return f"{horas:02d}:{minutos:02d}"
    except:
        return None


def time_to_minutes(time_str):
    """Converte string de tempo HH:MM para minutos"""
    if not time_str:
        return 0
    try:
        parts = time_str.split(':')
        hours = int(parts[0])
        minutes = int(parts[1]) if len(parts) > 1 else 0
        return hours * 60 + minutes
    except:
        return 0


def minutes_to_time(minutes):
    """Converte minutos para string HH:MM"""
    hours = abs(minutes) // 60
    mins = abs(minutes) % 60
    sign = '-' if minutes < 0 else ''
    return f"{sign}{hours:02d}:{mins:02d}"


# ==================== INICIALIZAÇÃO ====================

def inicializar_app():
    """Inicializa o banco de dados e cria tabelas"""
    with app.app_context():
        db.create_all()
        semear_usuarios_iniciais()
        print("Banco de dados inicializado!")
        
        # Criar backup inicial
        criar_backup()
        print("Backup inicial criado!")


def bootstrap_sistema():
    """Bootstrap para ambientes WSGI (ex.: PythonAnywhere)"""
    with app.app_context():
        db.create_all()
        semear_usuarios_iniciais()


# Executar bootstrap também quando módulo é importado
bootstrap_sistema()

if __name__ == '__main__':
    # Inicializar banco de dados
    inicializar_app()
    
    # Iniciar thread de backup automático
    backup_thread = threading.Thread(target=backup_automatico, daemon=True)
    backup_thread.start()

    alerta_thread = threading.Thread(target=alerta_email_automatico, daemon=True)
    alerta_thread.start()

    print("Sistema de backup automático ativado!")
    
    # Iniciar aplicação
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('DEBUG', 'True') == 'True'
    
    print(f"\n{'='*60}")
    print(f"Sistema de Banco de Horas - IPAJM")
    print(f"Servidor iniciado em: http://localhost:{port}")
    print(f"Backup automático a cada 6 horas")
    print(f"{'='*60}\n")
    
    app.run(host='0.0.0.0', port=port, debug=debug)
