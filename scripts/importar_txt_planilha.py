import re
import sqlite3
from datetime import datetime
from pathlib import Path

DB_PATH = Path('instance/banco_horas.db')
TXT_PATH = Path('data/Controle do Banco de Horas 2025-2026.txt')

DATE_RE = re.compile(r'\b(\d{1,2}/\d{1,2}/\d{4})\b')
TIME_RE = re.compile(r'\b(\d{1,2}:\d{2}):\d{2}\b')
NF_LINE_RE = re.compile(r'^\s*(\d{5,8})\s+([A-Za-zÀ-ÿ\'\-]+)\s+([A-Z]{2,5})\s+(\d{1,2}/\d{1,2}/\d{4}).*?(\d{1,2}/\d{1,2}/\d{4})\s*$')


def to_iso_date(mmddyyyy: str):
    m, d, y = mmddyyyy.split('/')
    return f"{int(y):04d}-{int(m):02d}-{int(d):02d}"


def to_hhmm(hhmmss: str):
    h, m, _ = hhmmss.split(':')
    return f"{int(h):02d}:{int(m):02d}"


def parse_rows(text: str):
    lines = [re.sub(r'<[^>]+>', '', ln).strip() for ln in text.splitlines()]
    rows = []
    name_parts = []
    last_times = None

    for ln in lines:
        if not ln:
            continue
        if ('HORAS TRABALHADAS' in ln or 'HORAS GOZADAS' in ln or ln.startswith('NF') or ln.lower() in {'horas','dias'}):
            continue

        # linha com horários (entrada/saida/trab/direito)
        times = re.findall(r'\b\d{1,2}:\d{2}:\d{2}\b', ln)
        if len(times) >= 4:
            last_times = times[:4]
            continue

        m = NF_LINE_RE.match(ln)
        if m:
            nf, sobrenome, setor, dia, prazo = m.groups()
            nome = ' '.join(name_parts + [sobrenome]).strip() or sobrenome
            entrada, saida, h_trab, h_direito = ('00:00:00', '00:00:00', '00:00:00', '00:00:00')
            if last_times:
                entrada, saida, h_trab, h_direito = last_times

            rows.append(
                {
                    'nf': nf,
                    'nome': re.sub(r'\s+', ' ', nome).strip(),
                    'setor': setor,
                    'dia_trabalhado': to_iso_date(dia),
                    'prazo_max': to_iso_date(prazo),
                    'entrada': to_hhmm(entrada),
                    'saida': to_hhmm(saida),
                    'h_trab': to_hhmm(h_trab),
                    'h_direito': to_hhmm(h_direito),
                }
            )
            name_parts = []
            last_times = None
            continue

        # possível fragmento de nome
        if not DATE_RE.search(ln) and not re.search(r'\d{5,8}', ln) and not TIME_RE.search(ln):
            if re.fullmatch(r"[A-Za-zÀ-ÿ\s\-']+", ln):
                if ln.lower().strip() not in {'horas','dias','dia','entrada','saída','trabalhado'}:
                    name_parts.append(ln)
                if len(name_parts) > 6:
                    name_parts = name_parts[-6:]

    return rows


def import_rows(rows):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    cur.execute('DELETE FROM dias_trabalhados')
    cur.execute('DELETE FROM servidores')

    servidores = {}
    now = datetime.utcnow().isoformat(sep=' ')

    for r in rows:
        if r['nf'] not in servidores:
            servidores[r['nf']] = (r['nf'], r['nome'], r['setor'], now, now)

    cur.executemany(
        'INSERT INTO servidores (nf, nome, setor, criado_em, atualizado_em) VALUES (?, ?, ?, ?, ?)',
        list(servidores.values()),
    )

    reg_values = [
        (
            r['nf'], r['nome'], r['setor'], None, r['dia_trabalhado'], r['entrada'], r['saida'],
            r['h_trab'], r['h_direito'], r['prazo_max'], None, '08:00', None, None, None, None, None, now, now
        )
        for r in rows
    ]

    cur.executemany(
        '''INSERT INTO dias_trabalhados
        (nf, nome, setor, vinculo, dia_trabalhado, entrada, saida, h_trab, h_direito, prazo_max,
         h_totais, hora_dia, dias_gozar, dias_gozados, h_descontadas, saldo, observacao, criado_em, atualizado_em)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
        reg_values,
    )

    conn.commit()
    conn.close()


if __name__ == '__main__':
    if not TXT_PATH.exists():
        raise SystemExit(f'Arquivo não encontrado: {TXT_PATH}')

    raw = TXT_PATH.read_text(encoding='utf-8', errors='ignore')
    rows = parse_rows(raw)
    if not rows:
        raise SystemExit('Nenhum registro parseado do TXT.')

    import_rows(rows)
    print(f'Registros importados: {len(rows)} | Servidores: {len(set(r["nf"] for r in rows))}')
