# app/dependencies.py
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def get_current_user_role(token: str = Depends(oauth2_scheme)):
    # ⚠️ Replace this with actual token decoding in production
    if token == "admin-token":
        return "admin"
    elif token == "principal-token":
        return "principal"
    elif token == "hod-token":
        return "hod"
    else:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid role")
