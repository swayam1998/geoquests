#!/usr/bin/env python3
"""Generate a visual database schema diagram."""
import sys
from sqlalchemy import inspect, text
from app.database import engine, Base
from app.config import settings

# Import models so they register with Base.metadata
from app.models.user import User, OAuthAccount, MagicLinkToken

def generate_mermaid_erd():
    """Generate Mermaid ERD diagram from database schema."""
    inspector = inspect(engine)
    all_tables = inspector.get_table_names()
    
    # Only show tables that are in our application's Base metadata
    app_table_names = {table.name for table in Base.metadata.tables.values()}
    app_tables = [t for t in all_tables if t in app_table_names]
    
    if not app_tables:
        print("No application tables found.")
        return
    
    print("```mermaid")
    print("erDiagram")
    print()
    
    # Generate table definitions
    for table_name in app_tables:
        columns = inspector.get_columns(table_name)
        print(f"    {table_name.upper()} {{")
        for col in columns:
            col_type = str(col['type'])
            # Simplify type names
            if 'VARCHAR' in col_type or 'TEXT' in col_type:
                col_type = 'string'
            elif 'INTEGER' in col_type or 'INT' in col_type:
                col_type = 'int'
            elif 'BOOLEAN' in col_type:
                col_type = 'bool'
            elif 'TIMESTAMP' in col_type or 'DATE' in col_type:
                col_type = 'datetime'
            elif 'UUID' in col_type:
                col_type = 'uuid'
            
            nullable = "" if col['nullable'] else " NOT NULL"
            pk = " PK" if col.get('primary_key') else ""
            print(f"        {col_type} {col['name']}{pk}{nullable}")
        print("    }")
        print()
    
    # Generate relationships
    for table_name in app_tables:
        fks = inspector.get_foreign_keys(table_name)
        for fk in fks:
            print(f"    {table_name.upper()} ||--o{{ {fk['referred_table'].upper()} : \"{fk['name']}\"")
    
    print("```")

def generate_html_schema():
    """Generate an HTML page showing the database schema."""
    inspector = inspect(engine)
    all_tables = inspector.get_table_names()
    
    # Only show tables that are in our application's Base metadata
    app_table_names = {table.name for table in Base.metadata.tables.values()}
    app_tables = [t for t in all_tables if t in app_table_names]
    
    html = """<!DOCTYPE html>
<html>
<head>
    <title>GeoQuests Database Schema</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        h1 {
            color: #333;
            border-bottom: 3px solid #4CAF50;
            padding-bottom: 10px;
        }
        .table-card {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .table-name {
            font-size: 24px;
            font-weight: bold;
            color: #4CAF50;
            margin-bottom: 15px;
            border-bottom: 2px solid #e0e0e0;
            padding-bottom: 10px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        th {
            background: #4CAF50;
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: 600;
        }
        td {
            padding: 10px 12px;
            border-bottom: 1px solid #e0e0e0;
        }
        tr:hover {
            background: #f9f9f9;
        }
        .type {
            font-family: 'Courier New', monospace;
            color: #666;
            font-size: 0.9em;
        }
        .pk {
            background: #FFD700;
            color: #333;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 0.8em;
            font-weight: bold;
        }
        .fk {
            background: #2196F3;
            color: white;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 0.8em;
        }
        .not-null {
            color: #d32f2f;
            font-weight: bold;
        }
        .index {
            background: #9C27B0;
            color: white;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 0.8em;
        }
        .info {
            background: #e3f2fd;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
            border-left: 4px solid #2196F3;
        }
    </style>
</head>
<body>
    <h1>🗄️ GeoQuests Database Schema</h1>
    <div class="info">
        <strong>Database:</strong> """ + (settings.DATABASE_URL.split('@')[-1] if '@' in settings.DATABASE_URL else settings.DATABASE_URL) + """<br>
        <strong>Tables:</strong> """ + str(len(app_tables)) + """
    </div>
"""
    
    for table_name in app_tables:
        columns = inspector.get_columns(table_name)
        indexes = inspector.get_indexes(table_name)
        fks = inspector.get_foreign_keys(table_name)
        
        html += f"""
    <div class="table-card">
        <div class="table-name">{table_name}</div>
        <table>
            <thead>
                <tr>
                    <th>Column</th>
                    <th>Type</th>
                    <th>Constraints</th>
                    <th>Default</th>
                </tr>
            </thead>
            <tbody>
"""
        
        for col in columns:
            col_type = str(col['type'])
            constraints = []
            if col.get('primary_key'):
                constraints.append('<span class="pk">PK</span>')
            if not col['nullable']:
                constraints.append('<span class="not-null">NOT NULL</span>')
            
            # Check if column is in any foreign key
            for fk in fks:
                if col['name'] in fk['constrained_columns']:
                    constraints.append(f'<span class="fk">FK → {fk["referred_table"]}.{fk["referred_columns"][0]}</span>')
            
            # Check if column is indexed
            for idx in indexes:
                if col['name'] in idx['column_names']:
                    idx_type = 'UNIQUE' if idx['unique'] else 'INDEX'
                    constraints.append(f'<span class="index">{idx_type}</span>')
            
            default = str(col['default']) if col['default'] is not None else ''
            constraints_str = ' '.join(constraints) if constraints else '-'
            
            html += f"""
                <tr>
                    <td><strong>{col['name']}</strong></td>
                    <td><span class="type">{col_type}</span></td>
                    <td>{constraints_str}</td>
                    <td>{default}</td>
                </tr>
"""
        
        html += """
            </tbody>
        </table>
    </div>
"""
    
    html += """
</body>
</html>
"""
    
    return html

def main():
    if len(sys.argv) > 1:
        format_type = sys.argv[1]
        
        if format_type == "mermaid":
            generate_mermaid_erd()
        elif format_type == "html":
            html = generate_html_schema()
            output_file = sys.argv[2] if len(sys.argv) > 2 else "schema.html"
            with open(output_file, 'w') as f:
                f.write(html)
            print(f"✅ Schema saved to {output_file}")
            print(f"   Open it in your browser to view!")
        else:
            print("Usage:")
            print("  python view_schema.py mermaid          # Print Mermaid ERD")
            print("  python view_schema.py html            # Generate HTML file (schema.html)")
            print("  python view_schema.py html <file>     # Generate HTML to specific file")
    else:
        # Default: generate HTML
        html = generate_html_schema()
        with open("schema.html", 'w') as f:
            f.write(html)
        print("✅ Schema saved to schema.html")
        print("   Open it in your browser to view!")
        print()
        print("Other options:")
        print("  python view_schema.py mermaid    # Print Mermaid ERD")
        print("  python view_schema.py html      # Generate HTML (default)")

if __name__ == "__main__":
    main()
