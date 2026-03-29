import logging
from app.services.automated_tasks import check_confirmations_v2

# Configure logging to see what's happening
logging.basicConfig(level=logging.INFO)

if __name__ == "__main__":
    print("Forzando ejecución de chequeo de confirmaciones...")
    check_confirmations_v2()
    print("Ejecución finalizada.")
