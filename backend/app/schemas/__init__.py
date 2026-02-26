from app.schemas.auth import Token, TokenData, UserLogin, UserCreate, UserOut, UserUpdate
from app.schemas.customer import CustomerCreate, CustomerUpdate, CustomerOut, CustomerList
from app.schemas.opportunity import OpportunityCreate, OpportunityUpdate, OpportunityOut, OpportunityList
from app.schemas.requirement import RequirementCreate, RequirementUpdate, RequirementOut, RequirementList
from app.schemas.solution import SolutionCreate, SolutionOut, SolutionList
from app.schemas.deliverable import DeliverableOut
from app.schemas.gen_job import GenJobOut
from app.schemas.dashboard import DashboardStats

__all__ = [
    "Token", "TokenData", "UserLogin", "UserCreate", "UserOut", "UserUpdate",
    "CustomerCreate", "CustomerUpdate", "CustomerOut", "CustomerList",
    "OpportunityCreate", "OpportunityUpdate", "OpportunityOut", "OpportunityList",
    "RequirementCreate", "RequirementUpdate", "RequirementOut", "RequirementList",
    "SolutionCreate", "SolutionOut", "SolutionList",
    "DeliverableOut", "GenJobOut", "DashboardStats",
]
