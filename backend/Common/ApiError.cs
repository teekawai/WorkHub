using System.Text.Json.Serialization;

namespace backend.Common;
//Gồm 2 thứ. ApiError là body lỗi chuẩn { code, message, errors }, errors bằng null thì không ghi  ra. ApiErrorCodes là danh sách hằng mã lỗi 
// (VALIDATION_ERROR, JOB_NOT_FOUND, NOT_JOB_OWNER...) để  không phải gõ chuỗi tay.
// Mã lỗi chuỗi trả về client (PLAN_CodingRules.md - bảng mã lỗi)
public  class ApiErrorCodes
{
    public const string ValidationError = "VALIDATION_ERROR";
    public const string Unauthenticated = "UNAUTHENTICATED";
    public const string ForbiddenRole = "FORBIDDEN_ROLE";
    public const string EmployerProfileNotFound = "EMPLOYER_PROFILE_NOT_FOUND";
    public const string EmployerNotVerified = "EMPLOYER_NOT_VERIFIED";
    public const string NotJobOwner = "NOT_JOB_OWNER";
    public const string JobNotFound = "JOB_NOT_FOUND";
    public const string JobHasApplications = "JOB_HAS_APPLICATIONS";
    public const string EmployerNotFound = "EMPLOYER_NOT_FOUND";
    public const string EmployerProfileChanged = "EMPLOYER_PROFILE_CHANGED";
    public const string JobAlreadyClosed = "JOB_ALREADY_CLOSED";
    public const string JobNotEditable = "JOB_NOT_EDITABLE";
    public const string InternalError = "INTERNAL_ERROR";
    public const string Forbidden = "FORBIDDEN";
    public const string NotFound = "NOT_FOUND";
    public const string Conflict = "CONFLICT";
    public const string ServiceUnavailable = "SERVICE_UNAVAILABLE";
    public const string TooManyRequests = "TOO_MANY_REQUESTS";
    public const string CompanyNameTaken = "COMPANY_NAME_TAKEN";
    public const string TaxCodeTaken = "TAX_CODE_TAKEN";
    public const string CompanyNameLocked = "COMPANY_NAME_LOCKED";
    public const string TaxCodeLocked = "TAX_CODE_LOCKED";
    public const string RequestInProgress = "REQUEST_IN_PROGRESS";
    public const string IdempotencyKeyReused = "IDEMPOTENCY_KEY_REUSED";
}

// Body lỗi chuẩn: { code, message, errors }
public record ApiError(
    string Code,
    string Message,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    IDictionary<string, string[]>? Errors = null);
