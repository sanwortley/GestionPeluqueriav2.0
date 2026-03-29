import os
import sys

def check():
    print("=== Diagnostic: Environment Variables ===")
    
    important_vars = [
        "WHATSAPP_BRIDGE_URL",
        "BACKEND_WEBSITE_URL",
        "ADMIN_PHONE",
        "TELEGRAM_BOT_TOKEN",
        "TELEGRAM_CHAT_ID",
        "ENVIRONMENT",
        "DATABASE_URL"
    ]
    
    for var in important_vars:
        val = os.getenv(var)
        if val:
            if "TOKEN" in var or "KEY" in var or "PASSWORD" in var or "DATABASE_URL" in var:
                # Mask secrets
                masked = val[:5] + "..." + val[-3:] if len(val) > 8 else "***"
                print(f"{var}: [SET] {masked}")
            else:
                print(f"{var}: {val}")
        else:
            print(f"{var}: [MISSING] ❌")

    print("\n=== Network Check (Internal) ===")
    # Try to resolve common internal names if possible
    # This is just a basic check
    print(f"Current Working Directory: {os.getcwd()}")
    print(f"Python Version: {sys.version}")

if __name__ == "__main__":
    check()
