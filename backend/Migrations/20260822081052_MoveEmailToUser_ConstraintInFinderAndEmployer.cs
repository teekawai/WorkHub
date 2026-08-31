using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class MoveEmailToUser_ConstraintInFinderAndEmployer : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "email1",
                table: "finderprofile");

            migrationBuilder.DropIndex(
                name: "email",
                table: "employerprofile");

            migrationBuilder.DropColumn(
                name: "email",
                table: "finderprofile");

            migrationBuilder.DropColumn(
                name: "email",
                table: "employerprofile");

            migrationBuilder.AddColumn<string>(
                name: "email",
                table: "users",
                type: "varchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "",
                collation: "utf8mb4_unicode_ci")
                .Annotation("MySql:CharSet", "utf8mb4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "email",
                table: "users");

            migrationBuilder.AddColumn<string>(
                name: "email",
                table: "finderprofile",
                type: "varchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "",
                collation: "utf8mb4_unicode_ci")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "email",
                table: "employerprofile",
                type: "varchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "",
                collation: "utf8mb4_unicode_ci")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "email1",
                table: "finderprofile",
                column: "email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "email",
                table: "employerprofile",
                column: "email",
                unique: true);
        }
    }
}
