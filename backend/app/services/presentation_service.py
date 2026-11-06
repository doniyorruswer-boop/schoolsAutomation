import io
import json
import urllib.parse
import httpx
import asyncio
from typing import Dict, Any, List, Optional
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from app.core.config import settings


class PresentationService:
    """
    Gamma uslubida chuqur, mazmunli dars taqdimotlarini (PowerPoint .pptx)
    va AI illyustratsiyalarini yaratuvchi xizmat.
    100% BEPUL va ochiq kodli texnologiyalar asosida ishlaydi.
    """

    @classmethod
    async def fetch_ai_image(cls, prompt_text: str) -> Optional[bytes]:
        """Bepul AI Image Generator orqali ta'limiy rasm olish"""
        try:
            clean_query = urllib.parse.quote(f"{prompt_text} educational high quality 3d clean")
            url = f"https://image.pollinations.ai/prompt/{clean_query}?width=700&height=500&nologo=true&seed=42"
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(url)
                if resp.status_code == 200 and len(resp.content) > 1000:
                    return resp.content
        except Exception as e:
            print(f"[Image Fetch Error]: {e}")
        return None

    @classmethod
    async def generate_presentation_data(
        cls,
        subject_name: str,
        grade: int,
        topic_title: str,
        slide_count: int = 5,
        include_images: bool = True,
        lang: str = "uz"
    ) -> Dict[str, Any]:
        """AI orqali chuqur, batafsil va mazmunli dars ssenariysini tuzish"""
        is_ru = lang.lower() == "ru" or any('\u0400' <= char <= '\u04FF' for char in topic_title + subject_name)
        
        if is_ru:
            prompt = f"""
Ты являешься опытным методистом-педагогом по созданию современных и содержательных презентаций к урокам в общеобразовательных школах Узбекистана (для русскоязычных классов).
Предмет: {subject_name}, {grade}-й класс.
Тема урока: "{topic_title}"

СТРОГИЕ ТРЕБОВАНИЯ:
1. Составь презентацию ИСКЛЮЧИТЕЛЬНО НА РУССКОМ ЯЗЫКЕ ровно из {slide_count} слайдов на 45 минут урока.
2. Для каждого слайда напиши МИНИМУМ 3-4 содержательных, полных тезиса (не ограничивайся короткими фразами!).
3. Включи точные формулы, определения, правила, практические примеры и частые ошибки учеников.
4. В поле "image_prompt" напиши краткое описание иллюстрации к слайду на английском языке.

Последовательность слайдов:
1-й слайд: Введение, девиз урока и ключевые цели
2-й слайд: Основные правила, теоремы, формулы и понятия
3-й слайд: Пошаговые примеры с решениями и вычислениями
4-й слайд: Интерактивная викторина, вопросы на логику и закрепление
5-й слайд: Итоги урока, выводы и домашнее задание

Формат ответа СТРОГО JSON:
{{
  "title": "{topic_title}",
  "subject": "{subject_name}",
  "grade": {grade},
  "include_images": {str(include_images).lower()},
  "slides": [
    {{
      "slide_number": 1,
      "type": "TITLE",
      "title": "Заголовок слайда на русском",
      "subtitle": "Подзаголовок или пояснение",
      "image_prompt": "educational 3d illustration of {topic_title} concept colorful",
      "bullet_points": [
        "1-й подробный тезис...",
        "2-й тезис...",
        "3-й тезис..."
      ]
    }}
  ]
}}
"""
        else:
            prompt = f"""
Sen O'zbekiston umumta'lim maktablari uchun professional dars taqdimotlari (slaydlar) tuzuvchi tajribali metodistsan.
Fan: {subject_name}, {grade}-sinf.
Dars mavzusi: "{topic_title}"

QAT'IY TALABLAR (Soddalikdan qochish, chuqur va to'liq mazmun berish):
1. Darsni 45 daqiqalik to'liq dars jarayoniga moslab aynan {slide_count} ta slaydga bo'l.
2. Har bir slayd uchun KAMIDA 3-4 ta to'liq, chuqur va amaliy ma'lumot ber (shunchaki 1 qator umumiy gaplar bo'lmasin!).
3. Aniq formulalar, ta'riflar, qoidalar, hayotiy misollar va o'quvchilar ko'p adashadigan nozik nuqtalarni bayon qil.
4. "image_prompt" maydoniga ushbu slayd mavzusiga mos tushuvchi ingliz tilidagi chiroyli grafik/illyustratsiya tavsifini yoz.

Slaydlar ketma-ketligi:
1-slayd: Kirish, dars shiori va asosiy maqsadlar
2-slayd: Asosiy qoidalar, formulalar va matematik/ilmiy ta'riflar
3-slayd: Bosqichma-bosqich amaliy misollar va hisoblash usullari
4-slayd: Interfaol viktorina, mantiqiy savollar va o'quvchilar bilan muloqot
5-slayd: Dars xulosasi, mustahkamlash qoidalari va aniq uyga vazifa

Javobni FAQAT quyidagi JSON formatida ber:
{{
  "title": "{topic_title}",
  "subject": "{subject_name}",
  "grade": {grade},
  "include_images": {str(include_images).lower()},
  "slides": [
    {{
      "slide_number": 1,
      "type": "TITLE",
      "title": "Slayd sarlavhasi (chuqur va aniq)",
      "subtitle": "Qisqa izoh yoki asosiy tushuncha",
      "image_prompt": "educational illustration of {topic_title} concept colorful 3d",
      "bullet_points": [
        "1-batafsil tushuntirish va qoida...",
        "2-batafsil tushuntirish va formulalar...",
        "3-amaliy ahamiyati va hayotdagi o'rni..."
      ]
    }}
  ]
}}
"""
        presentation_dict = None
        if settings.GEMINI_API_KEY:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent?key={settings.GEMINI_API_KEY}"
                payload = {
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {
                        "temperature": 0.3,
                        "responseMimeType": "application/json"
                    }
                }
                async with httpx.AsyncClient(timeout=45.0) as client:
                    resp = await client.post(url, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
                        text = "".join(p.get("text", "") for p in parts if "text" in p).strip()
                        if text.startswith("```"):
                            import re
                            text = re.sub(r"^```(?:json)?\n?", "", text)
                            text = re.sub(r"\n?```$", "", text)
                        presentation_dict = json.loads(text.strip())
            except Exception as e:
                print(f"[Presentation AI Error]: {e}")

        if not presentation_dict:
            presentation_dict = cls._generate_fallback_presentation(subject_name, grade, topic_title, slide_count)

        presentation_dict["include_images"] = include_images

        # Rasm URL larini shakllantirish (Brauzerda ham ko'rinishi uchun)
        for s in presentation_dict.get("slides", []):
            img_prompt = s.get("image_prompt") or f"{topic_title} {s.get('title', '')}"
            clean_q = urllib.parse.quote(f"{img_prompt} educational vector 3d")
            s["image_url"] = f"https://image.pollinations.ai/prompt/{clean_q}?width=700&height=500&nologo=true"

        return presentation_dict

    @classmethod
    async def create_pptx_file_async(cls, presentation_data: Dict[str, Any], include_images: bool = True) -> io.BytesIO:
        """
        python-pptx yordamida 16:9 zamonaviy dizayndagi PowerPoint (.pptx) fayli yasash.
        Agar include_images=True bo'lsa, AI rasmlari yuklanib, slaydga joylanadi.
        """
        prs = Presentation()
        prs.slide_width = Inches(13.333)
        prs.slide_height = Inches(7.5)
        blank_slide_layout = prs.slide_layouts[6]

        slides = presentation_data.get("slides", [])
        subject = presentation_data.get("subject", "Fan")
        grade = presentation_data.get("grade", 7)

        # Agar rasmlar yoqilgan bo'lsa, rasmlarni parallel yuklab olamiz
        downloaded_images = {}
        if include_images:
            async def load_img(s_idx, s_info):
                prompt = s_info.get("image_prompt") or s_info.get("title", "")
                img_bytes = await cls.fetch_ai_image(prompt)
                if img_bytes:
                    downloaded_images[s_idx] = img_bytes

            tasks = [load_img(i, s) for i, s in enumerate(slides)]
            await asyncio.gather(*tasks, return_exceptions=True)

        COLOR_PRIMARY = RGBColor(30, 58, 138)    # To'q ko'k
        COLOR_ACCENT = RGBColor(37, 99, 235)     # Moviy
        COLOR_BG = RGBColor(248, 250, 252)       # Ochiq fon
        COLOR_CARD = RGBColor(255, 255, 255)     # Oq kartochka
        COLOR_TEXT_MAIN = RGBColor(15, 23, 42)   # To'q matn
        COLOR_TEXT_MUTED = RGBColor(100, 116, 139) # Kulrang

        for idx, s_data in enumerate(slides):
            slide = prs.slides.add_slide(blank_slide_layout)
            
            # Fon
            bg_shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), prs.slide_width, prs.slide_height)
            bg_shape.fill.solid()
            bg_shape.fill.fore_color.rgb = COLOR_BG
            bg_shape.line.fill.background()

            # Yuqori brending
            top_bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), prs.slide_width, Inches(0.12))
            top_bar.fill.solid()
            top_bar.fill.fore_color.rgb = COLOR_ACCENT
            top_bar.line.fill.background()

            # Slayd Turi va Sinf
            badge_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.35), Inches(5), Inches(0.35))
            tf_badge = badge_box.text_frame
            p_badge = tf_badge.paragraphs[0]
            p_badge.text = f"{subject.upper()}  |  {grade}-SINF DARSI"
            p_badge.font.size = Pt(11)
            p_badge.font.bold = True
            p_badge.font.color.rgb = COLOR_ACCENT

            # Slayd Sarlavhasi
            title_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.7), Inches(11.7), Inches(1.1))
            tf_title = title_box.text_frame
            tf_title.word_wrap = True
            p_title = tf_title.paragraphs[0]
            p_title.text = s_data.get("title", "")
            p_title.font.size = Pt(26)
            p_title.font.bold = True
            p_title.font.color.rgb = COLOR_PRIMARY

            subtitle = s_data.get("subtitle", "")
            if subtitle:
                p_sub = tf_title.add_paragraph()
                p_sub.text = subtitle
                p_sub.font.size = Pt(13)
                p_sub.font.color.rgb = COLOR_TEXT_MUTED

            # Layout: Agar rasm bo'lsa (chapda matn, o'ngda rasm), bo'lmasa to'liq kenglik
            has_image = include_images and (idx in downloaded_images)
            text_card_width = Inches(6.8) if has_image else Inches(11.73)

            # Matn kartochkasi
            card = slide.shapes.add_shape(
                MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(1.9), text_card_width, Inches(4.9)
            )
            card.fill.solid()
            card.fill.fore_color.rgb = COLOR_CARD
            card.line.color.rgb = RGBColor(226, 232, 240)
            card.line.width = Pt(1.5)

            # Matn punktlari
            content_box = slide.shapes.add_textbox(Inches(1.1), Inches(2.1), text_card_width - Inches(0.6), Inches(4.5))
            tf_content = content_box.text_frame
            tf_content.word_wrap = True

            bullets = s_data.get("bullet_points", [])
            for b_idx, pt in enumerate(bullets):
                p_bullet = tf_content.paragraphs[0] if b_idx == 0 else tf_content.add_paragraph()
                p_bullet.text = f"•  {pt}"
                p_bullet.font.size = Pt(15 if has_image else 17)
                p_bullet.font.color.rgb = COLOR_TEXT_MAIN
                p_bullet.space_after = Pt(14)
                p_bullet.font.name = "Calibri"

            # O'ng tomonga rasm joylash
            if has_image:
                img_stream = io.BytesIO(downloaded_images[idx])
                img_left = Inches(7.9)
                img_top = Inches(1.9)
                img_width = Inches(4.63)
                img_height = Inches(4.9)

                # Rasm ramkasi
                img_card = slide.shapes.add_shape(
                    MSO_SHAPE.ROUNDED_RECTANGLE, img_left - Inches(0.05), img_top - Inches(0.05),
                    img_width + Inches(0.1), img_height + Inches(0.1)
                )
                img_card.fill.solid()
                img_card.fill.fore_color.rgb = COLOR_CARD
                img_card.line.color.rgb = RGBColor(226, 232, 240)

                # Haqiqiy AI Rasm
                slide.shapes.add_picture(img_stream, img_left, img_top, img_width, img_height)

            # Footer
            footer_box = slide.shapes.add_textbox(Inches(0.8), Inches(6.9), Inches(11.7), Inches(0.4))
            tf_foot = footer_box.text_frame
            p_foot = tf_foot.paragraphs[0]
            p_foot.text = f"EduMaktab AI Taqdimot  •  Slayd {s_data.get('slide_number', idx + 1)}"
            p_foot.font.size = Pt(10)
            p_foot.font.color.rgb = COLOR_TEXT_MUTED

        output = io.BytesIO()
        prs.save(output)
        output.seek(0)
        return output

    @classmethod
    def _generate_fallback_presentation(cls, subject_name: str, grade: int, topic_title: str, slide_count: int) -> Dict[str, Any]:
        return {
            "title": topic_title,
            "subject": subject_name,
            "grade": grade,
            "slides": [
                {
                    "slide_number": 1,
                    "type": "TITLE",
                    "title": f"{topic_title} — Kirish va Asosiy Maqsadlar",
                    "subtitle": f"{grade}-sinf {subject_name} fani bo'yicha ko'rgazmali dars",
                    "image_prompt": f"educational illustration of {topic_title} concept colorful 3d",
                    "bullet_points": [
                        "Darsning asosiy maqsadi: Yangi mavzuning mohiyatini anglash va qoidalarni yodda saqlash.",
                        "Kutilayotgan natija: Nazariy bilimlarni misollar yechishda mustaqil va xatosiz qo'llay olish.",
                        "Dars shiori: 'Matematika barcha fanlarning kalitidir!' — har bir hisob-kitobga diqqatli bo'lamiz."
                    ]
                },
                {
                    "slide_number": 2,
                    "type": "THEORY",
                    "title": "Mavzuning Asosiy Qoidalari va Formulalari",
                    "subtitle": "Nazariy poydevor va ta'riflar",
                    "image_prompt": "blackboard with mathematical formulas and chalk drawings educational",
                    "bullet_points": [
                        f"{topic_title} qoidalarini amalda qo'llashda belgilar va amallar ketma-ketligiga rioya qilish shart.",
                        "Asosiy xususiyat: Ifodaning o'ng va chap qismlarini aynan tengligini saqlab turish.",
                        "Ehtiyot bo'ling: Eng ko'p uchraydigan xatolik — qavslarni ochishda ishoralarni adashtirishdir!",
                        "Xulosa: Har bir matematik qoida qat'iy mantiqiy isbotga asoslangan."
                    ]
                },
                {
                    "slide_number": 3,
                    "type": "EXAMPLES",
                    "title": "Bosqichma-bosqich Amaliy Misollar va Yechimlar",
                    "subtitle": "Namuna va hisoblash sirlari",
                    "image_prompt": "step by step math problem solving on a desk with notebook and pencil",
                    "bullet_points": [
                        "1-namunaviy misol: Berilgan shartlarni ajratib olib, standart formulaga keltiramiz.",
                        "2-namunaviy misol: Oraliq hisob-kitoblarni qat'iy ketma-ketlikda daftarga yozib boramiz.",
                        "Yechimni tekshirish: Chiqqan natijani dastlabki ifodaga qo'yib, to'g'riligini isbotlaymiz.",
                        "Eslatma: Murakkab misollarni kichik sodda qismlarga ajratib yechish eng to'g'ri usuldir."
                    ]
                },
                {
                    "slide_number": 4,
                    "type": "QUIZ",
                    "title": "O'quvchilar Bilan Interfaol Viktorina (Savol-Javob)",
                    "subtitle": "Zehn va topqirlik sinovi",
                    "image_prompt": "students raising hands in a modern classroom answering quiz questions",
                    "bullet_points": [
                        "1-savol: Ushbu mavzudagi asosiy qoidani kim so'zma-so'z aytib bera oladi?",
                        "2-savol: Agar berilgan kattalik manfiy songa o'zgarsa, natija qanday bo'ladi?",
                        "Tezkor topshiriq: Daftaringizda 2 daqiqa ichida o'xshash bitta misol tuzing va partadoshingiz bilan javobni almashtiring!",
                        "Faol o'quvchilarga rag'batlantiruvchi ballar beriladi!"
                    ]
                },
                {
                    "slide_number": 5,
                    "type": "SUMMARY",
                    "title": "Dars Xulosasi va Uyga Vazifa",
                    "subtitle": "Bilimlarni mustahkamlash",
                    "image_prompt": "happy students completing homework study desk warm light",
                    "bullet_points": [
                        f"Bugun biz {topic_title} mavzusining barcha qoidalarini to'liq ko'rib chiqdik.",
                        "Barcha faol qatnashgan o'quvchilar darsda munosib bilimlarini ko'rsatdilar.",
                        "Uyga vazifa: Darslikdagi mavzuga oid 5 ta mashqni to'liq yechish va qoidalarni yod olish.",
                        "Eslatma: Keyingi darsimizda ushbu mavzu bo'yicha 5 daqiqalik mustaqil ish o'tkaziladi."
                    ]
                }
            ]
        }
