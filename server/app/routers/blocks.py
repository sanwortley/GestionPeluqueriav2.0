from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.schemas.block import BlockCreate, BlockOut
from app.models.block import Block
from app.core.deps import get_db, get_current_admin

router = APIRouter()

@router.get("/", response_model=List[BlockOut])
def get_blocks(db: Session = Depends(get_db)):
    return db.query(Block).all()

@router.post("/", response_model=BlockOut, dependencies=[Depends(get_current_admin)])
def create_block(block_in: BlockCreate, db: Session = Depends(get_db)):
    block = Block(**block_in.model_dump())
    db.add(block)
    db.commit()
    db.refresh(block)
    return block

@router.delete("/{id}", dependencies=[Depends(get_current_admin)])
def delete_block(id: int, db: Session = Depends(get_db)):
    block = db.query(Block).filter(Block.id == id).first()
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")
    
    db.delete(block)
    db.commit()
    return {"ok": True}
