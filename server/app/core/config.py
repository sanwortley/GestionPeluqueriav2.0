from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: str = "5432"
    POSTGRES_DB: str = "roma_hair"
    DATABASE_URL: str = ""

    SECRET_KEY: str = "yoursecretkey"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10
    
    ENVIRONMENT: str = "local" # local, production
    
    TIMEZONE: str = "America/Argentina/Cordoba"

    class Config:
        case_sensitive = True
        env_file = ".env"

    def get_database_url(self):
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

@lru_cache()
def get_settings():
    settings = Settings()
    
    # Priority: Env Var DATABASE_URL > Constructed URL
    import os
    env_url = os.getenv("DATABASE_URL")
    if env_url:
        # Fix for Render (postgres:// -> postgresql://)
        if env_url.startswith("postgres://"):
            env_url = env_url.replace("postgres://", "postgresql://", 1)
        settings.DATABASE_URL = env_url
    elif not settings.DATABASE_URL:
        settings.DATABASE_URL = settings.get_database_url()
        
    return settings

settings = get_settings()
