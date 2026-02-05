from app.db.session import SessionLocal
from app.models.admin_user import AdminUser
from app.core.security import get_password_hash

def seed_admin():
    db = SessionLocal()
    email = "admin@romacabello.com"
    password = "admin"
    
    existing = db.query(AdminUser).filter(AdminUser.email == email).first()
    if not existing:
        print(f"Creating admin user: {email}")
        user = AdminUser(
            email=email,
            password_hash=get_password_hash(password)
        )
        db.add(user)
        db.commit()
    else:
        print("Admin user already exists")
    
    db.close()

if __name__ == "__main__":
    seed_admin()
