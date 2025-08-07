# app/dependencies.py
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from typing import Dict, Optional
import jwt
import requests
import os
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Department

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# M365/Azure AD configuration - set via environment variables
AZURE_AD_CONFIG = {
    "tenant_id": os.getenv("AZURE_TENANT_ID", "your-tenant-id"),
    "client_id": os.getenv("AZURE_CLIENT_ID", "your-client-id"),
    "issuer": f"https://login.microsoftonline.com/{os.getenv('AZURE_TENANT_ID', 'your-tenant-id')}/v2.0",
    "jwks_uri": f"https://login.microsoftonline.com/{os.getenv('AZURE_TENANT_ID', 'your-tenant-id')}/discovery/v2.0/keys",
    "audience": os.getenv("AZURE_CLIENT_ID", "your-client-id")
}

# Environment flag to enable/disable development tokens
ENABLE_DEV_TOKENS = os.getenv("ENABLE_DEV_TOKENS", "true").lower() == "true"

def get_azure_public_keys():
    """Fetch Azure AD public keys for JWT verification"""
    try:
        response = requests.get(AZURE_AD_CONFIG["jwks_uri"], timeout=10)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Error fetching Azure public keys: {e}")
        return None

def decode_m365_jwt_production(token: str) -> str:
    """
    Extract email from Microsoft 365 JWT token with proper verification
    """
    try:
        # In production, verify the token signature
        if ENABLE_DEV_TOKENS:
            # Development mode - skip verification
            decoded = jwt.decode(
                token, 
                options={"verify_signature": False}
            )
        else:
            # Production mode - verify signature with Azure public keys
            jwks = get_azure_public_keys()
            if not jwks:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Unable to verify token - JWKS unavailable"
                )
            
            # Decode header to get key ID
            unverified_header = jwt.get_unverified_header(token)
            key_id = unverified_header.get("kid")
            
            # Find the matching public key
            public_key = None
            for key in jwks.get("keys", []):
                if key.get("kid") == key_id:
                    public_key = jwt.algorithms.RSAAlgorithm.from_jwk(key)
                    break
            
            if not public_key:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Unable to find matching public key"
                )
            
            # Verify and decode the token
            decoded = jwt.decode(
                token,
                public_key,
                algorithms=["RS256"],
                audience=AZURE_AD_CONFIG["audience"],
                issuer=AZURE_AD_CONFIG["issuer"]
            )
        
        # Extract email from M365 token claims
        email = decoded.get("preferred_username") or decoded.get("upn") or decoded.get("email")
        
        if not email:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email not found in token"
            )
        
        return email
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except jwt.InvalidAudienceError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token audience"
        )
    except jwt.InvalidIssuerError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token issuer"
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token validation error: {str(e)}"
        )

def get_user_by_email(email: str, db: Session) -> User:
    """
    Get user from database by email - same method as your login
    """
    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"User not found: {email}"
        )
    
    return user

def get_current_user_info(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Dict:
    """Get current user information using M365 JWT or development tokens"""
    
    # Handle development/testing tokens (only if enabled)
    if ENABLE_DEV_TOKENS and token.endswith("-token"):
        # Fallback to hardcoded tokens for development/testing
        TOKEN_MAP = {
            "admin-token": {"role": "admin", "user_id": 1, "department_id": None},
            "principal-token": {"role": "principal", "user_id": 2, "department_id": None},
            "hod-civ-token": {"role": "hod", "user_id": 6, "department_id": 1},
            "hod-eee-token": {"role": "hod", "user_id": 3, "department_id": 2},
            "hod-mec-token": {"role": "hod", "user_id": 7, "department_id": 3},
            "hod-ece-token": {"role": "hod", "user_id": 8, "department_id": 4},
            "hod-cse-token": {"role": "hod", "user_id": 9, "department_id": 5},
            "hod-inf-token": {"role": "hod", "user_id": 10, "department_id": 6},
            "hod-csm-token": {"role": "hod", "user_id": 11, "department_id": 7},
            "hod-csd-token": {"role": "hod", "user_id": 12, "department_id": 8},
            "hod-mba-token": {"role": "hod", "user_id": 13, "department_id": 9},
            "hod-token": {"role": "hod", "user_id": 6, "department_id": 1}
        }
        
        if token in TOKEN_MAP:
            return TOKEN_MAP[token]
        else:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid development token")
    
    # Production: Extract email from M365 JWT and lookup user in database
    email = decode_m365_jwt_production(token)
    user = get_user_by_email(email, db)
    
    return {
        "role": user.role,
        "user_id": user.id,
        "department_id": user.department_id,
        "email": user.email,
        "name": user.name
    }

def get_current_user_role(token: str = Depends(oauth2_scheme)) -> str:
    """Get current user role (backward compatibility)"""
    user_info = get_current_user_info(token)
    return user_info["role"]

def get_current_user_id(token: str = Depends(oauth2_scheme)) -> int:
    """Get current user ID from token"""
    user_info = get_current_user_info(token)
    return user_info["user_id"]

def get_current_department_id(token: str = Depends(oauth2_scheme)) -> Optional[int]:
    """Get current user's department ID from token"""
    user_info = get_current_user_info(token)
    return user_info.get("department_id")
