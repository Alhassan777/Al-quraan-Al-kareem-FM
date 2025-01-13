import os
import pandas as pd
from sqlalchemy import create_engine

# Paths for the script
BASE_DIR = os.path.abspath(os.path.dirname(__file__))  # Points to the current directory
DB_PATH = os.path.join(BASE_DIR, "sheikh_playlist.db")
DATABASE_URI = f"sqlite:///{DB_PATH}"
EXCEL_FILE = os.path.join(BASE_DIR, "Sheikh Playlist.xlsx")


def load_excel_to_db():
    """
    Reads an Excel file and writes its content to a SQLite database.
    """
    try:
        print(f"Database absolute path: {DB_PATH}")
        print(f"Excel file absolute path: {EXCEL_FILE}")

        # Check if the Excel file exists
        if not os.path.exists(EXCEL_FILE):
            print(f"Error: Excel file not found at {EXCEL_FILE}")
            return

        # Read Excel file
        df = pd.read_excel(EXCEL_FILE)

        # Validate the DataFrame
        if df.empty:
            print("Error: The Excel file is empty.")
            return

        # Rename columns if necessary
        required_columns = {"الشيخ": "reciter", "بلايليست": "link"}
        if not all(col in df.columns for col in required_columns.keys()):
            print(f"Error: Excel columns do not match expected structure. Found: {list(df.columns)}")
            return

        df.rename(columns=required_columns, inplace=True)

        # Add an 'id' column if missing
        if 'id' not in df.columns:
            df.reset_index(inplace=True, drop=False)
            df.rename(columns={'index': 'id'}, inplace=True)

        # Create database connection and write data
        engine = create_engine(DATABASE_URI)
        df.to_sql('sheikh_playlist', engine, if_exists='replace', index=False)

        print("Data successfully loaded into the database!")

    except Exception as e:
        print(f"An error occurred: {e}")


if __name__ == "__main__":
    load_excel_to_db()
