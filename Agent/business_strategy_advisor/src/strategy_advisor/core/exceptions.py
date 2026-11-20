"""Custom exceptions for the strategy advisor."""


class StrategyAdvisorError(Exception):
    """Base exception."""


class ConfigurationError(StrategyAdvisorError):
    pass


class ProviderUnavailableError(StrategyAdvisorError):
    pass


class EvidenceError(StrategyAdvisorError):
    pass


class ResearchError(StrategyAdvisorError):
    pass


class ToolNotAllowedError(ResearchError):
    pass


class SourceValidationError(ResearchError):
    pass


class PlanningError(StrategyAdvisorError):
    pass


class PlanValidationError(StrategyAdvisorError):
    pass


class PersistenceError(StrategyAdvisorError):
    pass


class BusinessIsolationError(StrategyAdvisorError):
    pass