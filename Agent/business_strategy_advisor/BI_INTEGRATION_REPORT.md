# BI Integration Report

## Contract
`BusinessEvidenceProvider` v1.0: `get_evidence(request, context) -> BusinessEvidencePack`, `health_check()`. Implemented: mock adapter (default) and HTTP adapter (expects `/health` and `POST /v1/evidence`).

## Verification
No Business Intelligence service exists in the repository (`Agent/` contains only `backend/` and this module). The HTTP adapter is implemented and documented; live connectivity is blocked. Mock evidence is explicitly sourced as `mock_business_intelligence` and never represented as real ERP data. All plans record `evidence_source` and limitations accordingly.

## Tenant isolation / freshness
Business ID flows through the request and evidence pack; missing fields are recorded in `data_quality.missing_fields` and `missing_data`. Date range defaults to 30 days. No cross-business data reuse.