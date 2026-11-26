using MySqlConnector;

namespace backend.Common;

public static class DbErrors
{
    // lỗi nằm sâu trong chuỗi InnerException (InvalidOperationException "transient failure" <- DbUpdateException <- MySqlException) nên phải duyệt cả chuỗi
    public static bool IsDeadlock(Exception? ex) => Has(ex, MySqlErrorCode.LockDeadlock);

    // 1062: vi phạm unique index
    public static bool IsDuplicateKey(Exception? ex) => Has(ex, MySqlErrorCode.DuplicateKeyEntry);

    // 1452: vi phạm khóa ngoại khi INSERT / UPDATE
    public static bool IsForeignKeyViolation(Exception? ex) => Has(ex, MySqlErrorCode.NoReferencedRow2);

    private static bool Has(Exception? ex, MySqlErrorCode code)
    {
        for (; ex != null; ex = ex.InnerException)
            if (ex is MySqlException e && e.ErrorCode == code) return true;
        return false;
    }
}
