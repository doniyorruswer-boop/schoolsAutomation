from typing import Dict, Any, List, Tuple


class AssessmentValidator:
    """
    AI tomonidan generatsiya qilingan yoki tahrirlangan BSB/CHSB ni qat'iy dasturiy tekshirish.
    AI hisob-kitobiga ishonilmaydi, kod har bir ball va deskriptorni qayta sanaydi!
    """

    @staticmethod
    def validate_assessment_content(content: Dict[str, Any], target_total_score: int) -> Tuple[bool, Dict[str, Any]]:
        errors: List[str] = []
        warnings: List[str] = []
        
        variants = content.get("variants", [])
        if not variants:
            return False, {"is_valid": False, "errors": ["Hech qanday variant mavjud emas."]}
            
        checked_variants = []
        
        for v_idx, variant in enumerate(variants):
            v_num = variant.get("variant_number", v_idx + 1)
            questions = variant.get("questions", [])
            
            if not questions:
                errors.append(f"{v_num}-variantda birorta savol yo'q.")
                continue
                
            variant_calculated_total = 0
            
            for q_idx, q in enumerate(questions):
                q_num = q.get("number", q_idx + 1)
                q_max_score = q.get("max_score", 0)
                descriptors = q.get("descriptors", [])
                
                # Deskriptorlar yig'indisini hisoblash
                desc_sum = sum(d.get("points", 0) for d in descriptors)
                
                if not descriptors:
                    warnings.append(f"{v_num}-variant, {q_num}-savol uchun baholash mezonlari (deskriptorlar) ko'rsatilmagan.")
                elif desc_sum != q_max_score:
                    errors.append(
                        f"{v_num}-variant, {q_num}-savol: Deskriptorlar yig'indisi ({desc_sum} ball) "
                        f"savolning maksimal baliga ({q_max_score} ball) teng emas!"
                    )
                    
                variant_calculated_total += q_max_score
                
            # Variant umumiy balini tekshirish
            if variant_calculated_total != target_total_score:
                errors.append(
                    f"{v_num}-variantning barcha savollari yig'indisi ({variant_calculated_total} ball) "
                    f"belgilangan umumiy ballga ({target_total_score} ball) teng emas!"
                )
                
            checked_variants.append({
                "variant_number": v_num,
                "questions_count": len(questions),
                "calculated_total_score": variant_calculated_total,
                "matches_target": variant_calculated_total == target_total_score
            })
            
        is_valid = len(errors) == 0
        
        report = {
            "is_valid": is_valid,
            "target_total_score": target_total_score,
            "errors": errors,
            "warnings": warnings,
            "checked_variants": checked_variants
        }
        
        return is_valid, report
