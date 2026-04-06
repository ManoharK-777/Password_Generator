import sys
import os

# Add your project directory to the sys.path
project_home = os.path.dirname(os.path.abspath(__file__))
if project_home not in sys.path:
    sys.path.insert(0, project_home)

# Import the Flask app object from app.py
from app import app as application

# This 'application' object will be used by PythonAnywhere's WSGI server.
