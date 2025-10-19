import os
BASE_DIR = os.path.abspath(os.path.dirname(__file__))

class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "change_this_to_a_random_secret_key_please")
    SQLALCHEMY_DATABASE_URI = "sqlite:///" + os.path.join(BASE_DIR, "overtime.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    COMPANY_NAME = "KCAL"
    LOGO_PATH = "static/kcal_logo.png"
    DEFAULT_DEPARTMENT = "Packaging"
