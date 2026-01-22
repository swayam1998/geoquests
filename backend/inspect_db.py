#!/usr/bin/env python3
"""Script to inspect database tables and schema."""
import sys
from sqlalchemy import inspect, text
from app.database import engine, Base
from app.config import settings

# Import models so they register with Base.metadata
from app.models.user import User, OAuthAccount, MagicLinkToken

def show_tables():
    """Show all tables in the database."""
    inspector = inspect(engine)
    all_tables = inspector.get_table_names()
    
    # Only show tables that are in our application's Base metadata
    # This filters out all PostGIS system tables automatically
    app_table_names = {table.name for table in Base.metadata.tables.values()}
    tables = [t for t in all_tables if t in app_table_names]
    
    # Also include alembic_version (migration tracking)
    if 'alembic_version' in all_tables:
        tables.insert(0, 'alembic_version')
    
    print(f"\n{'='*60}")
    print(f"Database: {settings.DATABASE_URL.split('@')[-1] if '@' in settings.DATABASE_URL else settings.DATABASE_URL}")
    print(f"{'='*60}\n")
    
    if not tables:
        print("No application tables found in database.")
        print("\nMake sure:")
        print("1. Database is running (docker compose up -d)")
        print("2. Migrations are run (alembic upgrade head)")
        return
    
    print(f"Application Tables ({len(tables)}):\n")
    print("(PostGIS system tables are hidden - they're managed automatically)\n")
    
    for i, table_name in enumerate(tables, 1):
        print(f"{i}. {table_name}")
        columns = inspector.get_columns(table_name)
        print(f"   Columns ({len(columns)}):")
        for col in columns:
            col_type = str(col['type'])
            nullable = "NULL" if col['nullable'] else "NOT NULL"
            default = f" DEFAULT {col['default']}" if col['default'] is not None else ""
            print(f"      - {col['name']}: {col_type} {nullable}{default}")
        
        # Show indexes
        indexes = inspector.get_indexes(table_name)
        if indexes:
            print(f"   Indexes ({len(indexes)}):")
            for idx in indexes:
                unique = "UNIQUE" if idx['unique'] else ""
                # Filter out None values from column_names
                cols = ", ".join([c for c in idx.get('column_names', []) if c is not None])
                if cols:
                    print(f"      - {idx['name']} ({cols}) {unique}")
                else:
                    print(f"      - {idx['name']} {unique}")
        
        # Show foreign keys
        fks = inspector.get_foreign_keys(table_name)
        if fks:
            print(f"   Foreign Keys ({len(fks)}):")
            for fk in fks:
                print(f"      - {fk['name']}: {', '.join(fk['constrained_columns'])} -> {fk['referred_table']}.{', '.join(fk['referred_columns'])}")
        
        print()

def show_table_data(table_name: str, limit: int = 10):
    """Show sample data from a table."""
    inspector = inspect(engine)
    if table_name not in inspector.get_table_names():
        print(f"Table '{table_name}' not found.")
        return
    
    with engine.connect() as conn:
        result = conn.execute(text(f"SELECT * FROM {table_name} LIMIT {limit}"))
        rows = result.fetchall()
        columns = result.keys()
        
        print(f"\n{'='*60}")
        print(f"Table: {table_name} (showing {len(rows)} row(s))")
        print(f"{'='*60}\n")
        
        if not rows:
            print("No data in table.")
            return
        
        # Print header
        col_widths = {col: max(len(str(col)), max(len(str(row[i])) if row[i] is not None else 4 for row in rows)) for i, col in enumerate(columns)}
        header = " | ".join(str(col).ljust(col_widths[col]) for col in columns)
        print(header)
        print("-" * len(header))
        
        # Print rows
        for row in rows:
            row_str = " | ".join(str(val)[:col_widths[col]].ljust(col_widths[col]) if val is not None else "NULL".ljust(col_widths[col]) for col, val in zip(columns, row))
            print(row_str)

def show_row_count():
    """Show row count for each table."""
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    
    if not tables:
        print("No tables found.")
        return
    
    print(f"\n{'='*60}")
    print("Row Counts")
    print(f"{'='*60}\n")
    
    with engine.connect() as conn:
        for table_name in tables:
            result = conn.execute(text(f"SELECT COUNT(*) FROM {table_name}"))
            count = result.scalar()
            print(f"{table_name}: {count} row(s)")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "tables":
            show_tables()
        elif command == "count":
            show_row_count()
        elif command == "data" and len(sys.argv) > 2:
            table_name = sys.argv[2]
            limit = int(sys.argv[3]) if len(sys.argv) > 3 else 10
            show_table_data(table_name, limit)
        else:
            print("Usage:")
            print("  python inspect_db.py tables          # Show all tables and schema")
            print("  python inspect_db.py count          # Show row counts")
            print("  python inspect_db.py data <table>   # Show data from a table")
            print("  python inspect_db.py data <table> <limit>  # Show data with limit")
    else:
        show_tables()
        print("\n" + "="*60)
        print("For more options:")
        print("  python inspect_db.py tables          # Show all tables and schema")
        print("  python inspect_db.py count            # Show row counts")
        print("  python inspect_db.py data <table>     # Show data from a table")
        print("="*60)
