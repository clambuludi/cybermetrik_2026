import sqlite3
import pandas as pd
import os
# Ajustar la ruta a la base de datos según sea necesario en tu proyecto Flask. 
# Si el script se corre en la raíz, 'instance/cybermetrik.db' es correcto normalmene.
DB_PATH = 'instance/cybermetrik.db'
# URL exportable del Google Sheet
EXCEL_URL = 'https://docs.google.com/spreadsheets/d/10Fq-qcHhX6MJZCrA--tE6_uhqupDSbp8/export?format=xlsx'
def migrate_data():
    # Asegurar que el directorio de la base de datos exista antes de conectar
    db_dir = os.path.dirname(os.path.abspath(DB_PATH))
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)

    # Validar de forma preventiva que la base de datos exista
    if not os.path.exists(DB_PATH):
        print(f"Advertencia: No se encontró la BD en {DB_PATH}. Si es la primera vez, el archivo se creará automáticamente pero la tabla 'preguntas' podría no existir.")
    # Conectar a la base de datos SQLite
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Asegurarnos de que la tabla principal exista
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS preguntas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            id_norma TEXT,
            dominio TEXT,
            tipo_control TEXT,
            version TEXT,
            pregunta TEXT,
            activo INTEGER DEFAULT 1
        )
    ''')
    conn.commit()

    # 1. Preparación de la base de datos
    # Verificar si existen las columnas esperadas en tabla preguntas; si no, crearlas
    cursor.execute("PRAGMA table_info(preguntas)")
    columnas_actuales = [col[1] for col in cursor.fetchall()]
    columnas_nuevas = {
        'id_norma': 'TEXT',
        'dominio': 'TEXT',
        'tipo_control': 'TEXT',
        'version': 'TEXT'
    }
    for col, dtype in columnas_nuevas.items():
        if col not in columnas_actuales:
            try:
                cursor.execute(f"ALTER TABLE preguntas ADD COLUMN {col} {dtype}")
                print(f"OK: Columna '{col}' agregada exitosamente.")
            except Exception as e:
                print(f"ERROR: Error agregando la columna '{col}': {e}")
    # Desactivar las preguntas actuales estableciendo activo = 0
    try:
        cursor.execute("UPDATE preguntas SET activo = 0")
        print("OK: Preguntas actuales desactivadas (activo=0).")
    except Exception as e:
        print(f"AVISO: Atención al desactivar preguntas: {e}. (Revisa si la col 'activo' existe)")
    print("Descargando y extrayendo los datos del Excel en línea...")
    try:
        # 2A. Preparar el catálogo para cruzar datos
        df_catalogo = pd.read_excel(EXCEL_URL, sheet_name='03 Catálogo de Controles', header=13)
        
        # Limpiar espacios en los nombres de las columnas para evitar errores de llave
        df_catalogo.columns = df_catalogo.columns.astype(str).str.strip()
        
        # Identificar las columnas del Excel dinámicamente en caso de variaciones de espacios
        col_id_cat = [c for c in df_catalogo.columns if 'código' in c.lower() or 'codigo' in c.lower()][0]
        col_tipo_cat = [c for c in df_catalogo.columns if 'tipo' in c.lower()][0]
        
        # Crear un diccionario para realizar un cruce de datos rápido: {'5.1': 'Preventivo', ...}
        mapping_tipo_control = dict(zip(df_catalogo[col_id_cat].astype(str).str.strip(), df_catalogo[col_tipo_cat]))
        # 2B. Cargar y extraer hoja
        # skiprows=18 salta las primeras 18 filas, comenzando así desde la fila 19 real (donde empiezan los datos)
        df_cuestionario = pd.read_excel(EXCEL_URL, sheet_name='04 Cuestionario ', header=None, skiprows=18)
        
        registros_a_insertar = []
        dominio_actual = "Dominio General"  # Fallback
        # Recorrer las filas del dataframe extraído
        for idx, row in df_cuestionario.iterrows():
            # Columna B (índice 1 de pandas) -> id_norma
            # Columna D (índice 3 de pandas) -> pregunta
            val_b = str(row[1]).strip() if pd.notna(row[1]) else ''
            val_d = str(row[3]).strip() if pd.notna(row[3]) else ''
            
            # Asignación de dominios: si no hay un id_norma pero sí hay texto en Columna D, es el título del dominio.
            if not val_b and val_d:
                dominio_actual = val_d
                continue
            
            # Si ambas columnas tienen valor, y no es casualmente el encabezado de "Control" o "Pregunta"
            if val_b and val_d and val_b.lower() not in ['control', 'id']:
                id_norma = val_b
                pregunta = val_d
                
                # Cruce de datos: Obtener el tipo_control usando el catálogo previamente mapeado
                tipo = mapping_tipo_control.get(id_norma)
                if pd.isna(tipo) or not tipo:
                    tipo = 'Desconocido'
                    
                # Guardar en la lista (omitimos 'id' asumiendo que es AUTOINCREMENT en tu diseño principal)
                # Formato: (id_norma, dominio, tipo_control, version, pregunta, activo)
                registros_a_insertar.append((id_norma, dominio_actual, tipo, '2022', pregunta, 1))
        # 3. Inserción de Datos ('executemany' por eficiencia en lugar de loops)
        if registros_a_insertar:
            query_insert = """
                INSERT INTO preguntas (id_norma, dominio, tipo_control, version, pregunta, activo)
                VALUES (?, ?, ?, ?, ?, ?)
            """
            cursor.executemany(query_insert, registros_a_insertar)
            conn.commit()
            print(f"OK: Migración exitosa: {cursor.rowcount} nuevos controles (v2022) insertados activos.")
        else:
            print("AVISO: No se encontraron registros válidos para insertar.")
    except Exception as e:
        conn.rollback() # Prevenir un estado inconsistente en la base de datos
        print(f"ERROR: Error crítico procesando la información del Excel: {e}")
    finally:
        conn.close()
if __name__ == '__main__':
    migrate_data()