using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddTaxCodeUniqueAndJobStatusDeadlineIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "ix_job_status_deadline",
                table: "job",
                columns: new[] { "status", "deadline" });

            migrationBuilder.CreateIndex(
                name: "taxCode",
                table: "employerprofile",
                column: "taxCode",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_job_status_deadline",
                table: "job");

            migrationBuilder.DropIndex(
                name: "taxCode",
                table: "employerprofile");
        }
    }
}
