from pydantic import BaseModel, Field

class SimulationInput(BaseModel):
    tables_x: int = Field(ge=0, le=100)
    chairs_y: int = Field(ge=0, le=100)

class UploadResponse(BaseModel):
    dataset: str
    imported: int
    message: str
