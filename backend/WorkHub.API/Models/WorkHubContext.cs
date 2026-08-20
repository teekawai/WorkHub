using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;

namespace WorkHub.API.Models;

public partial class WorkHubContext : DbContext
{
    public WorkHubContext()
    {
    }

    public WorkHubContext(DbContextOptions<WorkHubContext> options)
        : base(options)
    {
    }

    public virtual DbSet<Application> Applications { get; set; }

    public virtual DbSet<EmployerProfile> EmployerProfiles { get; set; }

    public virtual DbSet<FinderProfile> FinderProfiles { get; set; }

    public virtual DbSet<Job> Jobs { get; set; }

    public virtual DbSet<User> Users { get; set; }

    
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Application>(entity =>
        {
            entity.HasKey(e => e.ApplicationId).HasName("PK__Applicat__79FDB1CF690D82E4");

            entity.ToTable("Application");

            entity.Property(e => e.ApplicationId)
                .HasMaxLength(255)
                .IsUnicode(false)
                .HasColumnName("applicationId");
            entity.Property(e => e.AppliedAt)
                .HasColumnType("datetime")
                .HasColumnName("appliedAt");
            entity.Property(e => e.CoverLetter).HasColumnName("coverLetter");
            entity.Property(e => e.FinderId)
                .HasMaxLength(36)
                .IsUnicode(false)
                .HasColumnName("finderId");
            entity.Property(e => e.JobId)
                .HasMaxLength(36)
                .IsUnicode(false)
                .HasColumnName("jobId");
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("status");

            entity.HasOne(d => d.Finder).WithMany(p => p.Applications)
                .HasForeignKey(d => d.FinderId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Applicati__finde__59063A47");

            entity.HasOne(d => d.Job).WithMany(p => p.Applications)
                .HasForeignKey(d => d.JobId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Applicati__jobId__59FA5E80");
        });

        modelBuilder.Entity<EmployerProfile>(entity =>
        {
            entity.HasKey(e => e.UserId).HasName("PK__Employer__CB9A1CFF7E29C719");

            entity.ToTable("EmployerProfile");

            entity.HasIndex(e => e.Email, "UQ__Employer__AB6E61649ACE0509").IsUnique();

            entity.HasIndex(e => e.CompanyName, "UQ__Employer__B31074165905F8BB").IsUnique();

            entity.Property(e => e.UserId)
                .HasMaxLength(36)
                .IsUnicode(false)
                .HasColumnName("userId");
            entity.Property(e => e.Address)
                .HasMaxLength(255)
                .HasColumnName("address");
            entity.Property(e => e.CompanyName)
                .HasMaxLength(100)
                .HasColumnName("companyName");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.Email)
                .HasMaxLength(100)
                .IsUnicode(false)
                .HasColumnName("email");
            entity.Property(e => e.Field)
                .HasMaxLength(50)
                .HasColumnName("field");
            entity.Property(e => e.FoundedYear).HasColumnName("foundedYEAR");
            entity.Property(e => e.Logo)
                .HasMaxLength(255)
                .IsUnicode(false)
                .HasColumnName("logo");
            entity.Property(e => e.Phone)
                .HasMaxLength(15)
                .IsUnicode(false)
                .HasColumnName("phone");
            entity.Property(e => e.TaxCode)
                .HasMaxLength(15)
                .IsUnicode(false)
                .HasColumnName("taxCode");
            entity.Property(e => e.Website)
                .HasMaxLength(255)
                .IsUnicode(false)
                .HasColumnName("website");

            entity.HasOne(d => d.User).WithOne(p => p.EmployerProfile)
                .HasForeignKey<EmployerProfile>(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("employerId");
        });

        modelBuilder.Entity<FinderProfile>(entity =>
        {
            entity.HasKey(e => e.UserId).HasName("PK__FinderPr__CB9A1CFF119B88C2");

            entity.ToTable("FinderProfile");

            entity.HasIndex(e => e.Email, "UQ__FinderPr__AB6E61644C07CBCE").IsUnique();

            entity.Property(e => e.UserId)
                .HasMaxLength(36)
                .IsUnicode(false)
                .HasColumnName("userId");
            entity.Property(e => e.Address)
                .HasMaxLength(255)
                .HasColumnName("address");
            entity.Property(e => e.Avatar)
                .HasMaxLength(255)
                .IsUnicode(false)
                .HasColumnName("avatar");
            entity.Property(e => e.Cv)
                .HasMaxLength(255)
                .IsUnicode(false)
                .HasColumnName("CV");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.EducationLevel)
                .HasMaxLength(30)
                .HasColumnName("educationLevel");
            entity.Property(e => e.Email)
                .HasMaxLength(100)
                .IsUnicode(false)
                .HasColumnName("email");
            entity.Property(e => e.Experience).HasColumnName("experience");
            entity.Property(e => e.Fullname)
                .HasMaxLength(100)
                .HasColumnName("fullname");
            entity.Property(e => e.LinkedIn)
                .HasMaxLength(255)
                .IsUnicode(false);
            entity.Property(e => e.Major).HasMaxLength(50);
            entity.Property(e => e.Phone)
                .HasMaxLength(15)
                .IsUnicode(false)
                .HasColumnName("phone");
            entity.Property(e => e.Skill).HasColumnName("skill");

            entity.HasOne(d => d.User).WithOne(p => p.FinderProfile)
                .HasForeignKey<FinderProfile>(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("finderId");
        });

        modelBuilder.Entity<Job>(entity =>
        {
            entity.HasKey(e => e.JobId).HasName("PK__Job__164AA188E6B2CF71");

            entity.ToTable("Job");

            entity.Property(e => e.JobId)
                .HasMaxLength(36)
                .IsUnicode(false)
                .HasColumnName("jobID");
            entity.Property(e => e.ApplicantBenefit).HasColumnName("applicantBenefit");
            entity.Property(e => e.CreateAt)
                .HasColumnType("datetime")
                .HasColumnName("createAt");
            entity.Property(e => e.Deadline)
                .HasColumnType("datetime")
                .HasColumnName("deadline");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.EmployerId)
                .HasMaxLength(36)
                .IsUnicode(false)
                .HasColumnName("employerId");
            entity.Property(e => e.IsNegotiable).HasColumnName("isNegotiable");
            entity.Property(e => e.JobTitle)
                .HasMaxLength(255)
                .HasColumnName("jobTitle");
            entity.Property(e => e.Location)
                .HasMaxLength(255)
                .IsUnicode(false)
                .HasColumnName("location");
            entity.Property(e => e.NumberOfPosition).HasColumnName("numberOfPosition");
            entity.Property(e => e.Requirement).HasColumnName("requirement");
            entity.Property(e => e.Salary).HasColumnName("salary");
            entity.Property(e => e.SkillRequired)
                .HasMaxLength(255)
                .IsUnicode(false)
                .HasColumnName("skillRequired");
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("status");
            entity.Property(e => e.WorkType)
                .HasMaxLength(20)
                .HasColumnName("workType");

            entity.HasOne(d => d.Employer).WithMany(p => p.Jobs)
                .HasForeignKey(d => d.EmployerId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Job__employerId__5629CD9C");
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.UserId).HasName("PK__Users__CB9A1CFF0F0DF03D");

            entity.HasIndex(e => e.Username, "UQ__Users__F3DBC572469404CA").IsUnique();

            entity.Property(e => e.UserId)
                .HasMaxLength(36)
                .IsUnicode(false)
                .HasColumnName("userId");
            entity.Property(e => e.PasswordHash)
                .HasMaxLength(255)
                .IsUnicode(false)
                .HasColumnName("passwordHash");
            entity.Property(e => e.Role)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("role");
            entity.Property(e => e.Username)
                .HasMaxLength(50)
                .IsUnicode(false)
                .HasColumnName("username");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
