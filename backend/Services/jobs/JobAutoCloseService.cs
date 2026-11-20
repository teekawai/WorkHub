using backend.Common;
using backend.Repositories;

namespace backend.Services.jobs
{
    // Tự đóng Job quá hạn mỗi 00:00 giờ VN (Business 2.3); chạy bù 1 lần khi khởi động
    public class JobAutoCloseService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly TimeProvider _timeProvider;
        private readonly ILogger<JobAutoCloseService> _logger;

        public JobAutoCloseService(IServiceScopeFactory scopeFactory, TimeProvider timeProvider, ILogger<JobAutoCloseService> logger)
        {
            _scopeFactory = scopeFactory;
            _timeProvider = timeProvider;
            _logger = logger;
        }

        // thời gian còn lại đến 00:00 VN kế tiếp
        public static TimeSpan DelayUntilNextVnMidnight(DateTime utcNow)
        {
            var vnNow = VnTime.ToVn(utcNow);
            return vnNow.Date.AddDays(1) - vnNow;
        }

        public async Task<int> RunOnceAsync(CancellationToken ct)
        {
            using var scope = _scopeFactory.CreateScope();
            var repo = scope.ServiceProvider.GetRequiredService<IJobRepository>();
            var closed = await repo.CloseExpiredAsync(VnTime.Today(_timeProvider.GetUtcNow().UtcDateTime));
            _logger.LogInformation("Đã tự đóng {Count} Job quá hạn", closed);
            return closed;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            try
            {
                while (true)
                {
                    await SafeRunAsync(stoppingToken);
                    await Task.Delay(DelayUntilNextVnMidnight(_timeProvider.GetUtcNow().UtcDateTime), _timeProvider, stoppingToken);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                // host đang dừng
            }
        }

        // lỗi bất ngờ (DB sập...) chỉ log, chờ vòng sau — không làm sập host
        private async Task SafeRunAsync(CancellationToken ct)
        {
            try { await RunOnceAsync(ct); }
            catch (OperationCanceledException) when (ct.IsCancellationRequested) { throw; }
            catch (Exception ex) { _logger.LogError(ex, "Tự đóng Job quá hạn thất bại, thử lại ở lần 00:00 kế tiếp"); }
        }
    }
}
