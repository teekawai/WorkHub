using System;
using backend.Models;
namespace backend.Common;

public enum ErrorCode
{
    Success,
    NotFound,
    BadRequest,
    Conflict,
    Unauthorized,
    ServiceUnavailable
}

//  dùng chung cho toàn bộ Service layer, thay cho Result/ResultStatus/RefreshTokenValidateResult riêng lẻ trước đây
public class ServiceResult<T>
{
    public ErrorCode Code { get; set; }
    public string? Message { get; set; }
    public T? Data { get; set; }

    public bool IsSuccess => Code == ErrorCode.Success;

    public static ServiceResult<T> Success(T data, string? message = null) => new()
    {
        Code = ErrorCode.Success,
        Message = message,
        Data = data
    };

    public static ServiceResult<T> Fail(ErrorCode code, string message) => new()
    {
        Code = code,
        Message = message
    };
}
