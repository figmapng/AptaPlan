import { formatWeekRange,getStartOfWeek,getWeekDates } from '../date-service';
describe('date service',()=>{
  test('апта дүйсенбіден басталады',()=>expect(getStartOfWeek(new Date(2026,6,2)).getDay()).toBe(1));
  test('бір ай ішіндегі header',()=>{const d=new Date(2026,6,1);expect(formatWeekRange(d,new Date(2026,6,7))).toBe('01–07 шілде')});
  test('екі айға өтетін header',()=>expect(formatWeekRange(new Date(2026,6,29),new Date(2026,7,4))).toBe('29 шілде – 04 тамыз'));
  test('екі жылға өтетін header',()=>expect(formatWeekRange(new Date(2026,11,29),new Date(2027,0,4))).toBe('29 желтоқсан 2026 – 04 қаңтар 2027'));
  test('аптада 7 күн бар',()=>expect(getWeekDates(new Date(2026,6,2))).toHaveLength(7));
});
