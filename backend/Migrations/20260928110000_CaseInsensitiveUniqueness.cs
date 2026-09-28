using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <summary>
    /// Case-insensitive uniqueness of username and email through expression indexes on LOWER(...), which EF Core cannot model:
    /// the model is unchanged and the existing case-sensitive indexes stay in place.
    /// Stops with an explicit error if existing rows already differ only by letter case.
    /// </summary>
    public partial class CaseInsensitiveUniqueness : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
				DO $$
				BEGIN
					IF EXISTS (SELECT 1 FROM "Users" GROUP BY LOWER("Username") HAVING COUNT(*) > 1) THEN
						RAISE EXCEPTION 'Some usernames differ only by letter case: rename them before applying migration CaseInsensitiveUniqueness';
					END IF;
					IF EXISTS (SELECT 1 FROM "Users" WHERE "Email" IS NOT NULL GROUP BY LOWER("Email") HAVING COUNT(*) > 1) THEN
						RAISE EXCEPTION 'Some emails differ only by letter case: fix them before applying migration CaseInsensitiveUniqueness';
					END IF;
				END
				$$;

				CREATE UNIQUE INDEX "IX_Users_Username_Lower" ON "Users" (LOWER("Username"));
				CREATE UNIQUE INDEX "IX_Users_Email_Lower" ON "Users" (LOWER("Email"));
				""");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
				DROP INDEX IF EXISTS "IX_Users_Email_Lower";
				DROP INDEX IF EXISTS "IX_Users_Username_Lower";
				""");
        }
    }
}
