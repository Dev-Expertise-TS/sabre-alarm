// getRatePlanParams.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

/**
 * Sabre ID로 rate_code 조회 및 요금 파라미터 생성
 * @param {Object} options - 요청 옵션
 * @param {string} options.sabre_id
 * @param {string} options.check_in
 * @param {string} options.check_out
 * @param {number|string} options.number_of_people
 * @returns {Object} - { params } 또는 { error }
 */
async function getRatePlanParams({ sabre_id, check_in, check_out, number_of_people }) {
    const { data, error } = await supabase
        .from('select_hotels')
        .select('rate_code')
        .eq('sabre_id', sabre_id)
        .not('rate_code', 'is', null)
        .single();

    if (error || !data) {
        return {
            error: `숙소 데이터의 sabre_id(${sabre_id}) 및 rate_code가 없어 요금 조회가 불가능합니다.`,
        };
    }

    const rateCode = data.rate_code?.trim().toUpperCase();
    const ratePlanCodes = rateCode
        .split(',')
        .map(code => code.trim())
        .filter(code => code.length > 0);

    const exactMatchOnlyList = ['API', 'ZP3', 'VMC', 'TLC', 'H01', 'S72'];
    const forbiddenRateCodes = ['XLO', 'PPR', 'FAN', 'WMP', 'HPM', 'TID', 'STP'];

    if (forbiddenRateCodes.includes(ratePlanCodes)) {
        return {
            error: `요금 조회 불가: ${ratePlanCodes} 코드는 요금조회가 지원되지 않습니다.`,
        };
    }

    const exactMatchOnly = ratePlanCodes.every(code => exactMatchOnlyList.includes(code));

    return {
        HotelCode: sabre_id,
        StartDate: check_in,
        EndDate: check_out,
        Adults: parseInt(number_of_people, 10),
        CurrencyCode: 'KRW',
        ExactMatchOnly: exactMatchOnly,
        RatePlanCode: ratePlanCodes
    };
}

module.exports = { getRatePlanParams };
