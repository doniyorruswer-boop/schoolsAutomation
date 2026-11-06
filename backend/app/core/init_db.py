from app.core.database import engine, Base, SessionLocal
from app.models import User, Subject, Topic, LicenseKey, PlanType, LicenseStatus, LessonPlan
from app.data.seed_data.curriculum_seed import CURRICULUM_DATA
from app.services.license_service import generate_unique_key_code


def init_database():
    """Barcha jadvallarni yaratadi va boshlang'ich rasmiy o'quv mavzularini yuklaydi"""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    try:
        # 1. Admin foydalanuvchini tekshirish yoki yaratish
        admin = db.query(User).filter(User.telegram_id == "admin").first()
        if not admin:
            admin = User(
                telegram_id="admin",
                full_name="Bosh Metodist / Administrator",
                school_name="Respublika Ta'lim Markazi",
                is_admin=True,
                phone_number="+998901234567"
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)
            print("[Init DB] Bosh administrator yaratildi.")

        # 2. Sinov uchun dastlabki 3 ta litsenziya kodi yaratish
        if db.query(LicenseKey).count() == 0:
            sample_keys = [
                LicenseKey(
                    key_code="EDU-TEST-2026-PRO1",
                    plan_type=PlanType.PRO,
                    duration_days=30,
                    status=LicenseStatus.UNUSED,
                    notes="Dastlabki sinov PRO litsenziyasi"
                ),
                LicenseKey(
                    key_code="EDU-MAKTAB-7777-YEAR",
                    plan_type=PlanType.PRO,
                    duration_days=365,
                    status=LicenseStatus.UNUSED,
                    notes="Yillik to'liq litsenziya"
                )
            ]
            db.add_all(sample_keys)
            db.commit()
            print("[Init DB] Dastlabki sinov litsenziya kodlari yaratildi: EDU-TEST-2026-PRO1")

        # 3. O'quv dasturi (Mavzular bazasi) yuklash va yangilash
        for item in CURRICULUM_DATA:
            subject = db.query(Subject).filter(Subject.code == item["subject_code"]).first()
            if not subject:
                subject = Subject(name=item["subject_name"], code=item["subject_code"])
                db.add(subject)
                db.commit()
                db.refresh(subject)
            
            for t in item["topics"]:
                existing_topic = db.query(Topic).filter(
                    Topic.subject_id == subject.id,
                    Topic.grade == item["grade"],
                    Topic.quarter == item["quarter"],
                    Topic.title == t["title"]
                ).first()
                if not existing_topic:
                    topic = Topic(
                        subject_id=subject.id,
                        grade=item["grade"],
                        quarter=item["quarter"],
                        chapter=item["chapter"],
                        title=t["title"],
                        learning_objectives=t["objectives"]
                    )
                    db.add(topic)
        db.commit()
        print("[Init DB] Rasmiy DTS mavzulari bazaga to'liq yuklandi va sinxronlashtirildi.")

    finally:
        db.close()


if __name__ == "__main__":
    init_database()
