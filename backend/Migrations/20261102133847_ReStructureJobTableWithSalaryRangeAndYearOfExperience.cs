using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class ReStructureJobTableWithSalaryRangeAndYearOfExperience : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_application_job",
                table: "application");

            migrationBuilder.DropColumn(
                name: "experienceRequired",
                table: "job");

            migrationBuilder.DropColumn(
                name: "isNegotiable",
                table: "job");

            migrationBuilder.RenameColumn(
                name: "salary",
                table: "job",
                newName: "salaryMin");

            migrationBuilder.AddColumn<int>(
                name: "salaryMax",
                table: "job",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "salaryType",
                table: "job",
                type: "varchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "",
                collation: "utf8mb4_unicode_ci")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "subCategory",
                table: "job",
                type: "varchar(255)",
                maxLength: 255,
                nullable: true,
                collation: "utf8mb4_unicode_ci")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<int>(
                name: "yearOfExperience",
                table: "job",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddForeignKey(
                name: "fk_application_job",
                table: "application",
                column: "jobId",
                principalTable: "job",
                principalColumn: "jobId",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_application_job",
                table: "application");

            migrationBuilder.DropColumn(
                name: "salaryMax",
                table: "job");

            migrationBuilder.DropColumn(
                name: "salaryType",
                table: "job");

            migrationBuilder.DropColumn(
                name: "subCategory",
                table: "job");

            migrationBuilder.DropColumn(
                name: "yearOfExperience",
                table: "job");

            migrationBuilder.RenameColumn(
                name: "salaryMin",
                table: "job",
                newName: "salary");

            migrationBuilder.AddColumn<string>(
                name: "experienceRequired",
                table: "job",
                type: "varchar(255)",
                maxLength: 255,
                nullable: false,
                defaultValue: "",
                collation: "utf8mb4_unicode_ci")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<ulong>(
                name: "isNegotiable",
                table: "job",
                type: "bit(1)",
                nullable: false,
                defaultValue: 0ul);

            migrationBuilder.AddForeignKey(
                name: "fk_application_job",
                table: "application",
                column: "jobId",
                principalTable: "job",
                principalColumn: "jobId");
        }
    }
}
