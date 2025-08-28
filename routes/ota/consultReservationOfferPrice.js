require("dotenv").config()
const SabreService = require('../../lib/SabreService')
const { createClient } = require('@supabase/supabase-js')
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

async function consultReservationOfferPrice() {
    let consultReservations= await getFilteredReservations()
    const now = new Date();
    console.log('# consultReservations count : ' + consultReservations.length)
    for (const consultReservation of consultReservations) {
        if (SabreService.isInvalid(consultReservation) === 0) {
            console.log(' isInvalid ! consultReservationOfferPrice - no : ' + consultReservation.no + ', chat_id : ' + consultReservation.chat_id + ', sabre_id : ' + consultReservation.sabre_id +
              ', room_code : ' + consultReservation.room_code + 'room_name : ' + consultReservations.room_name +
              ', number_of_people : ' + consultReservation.number_of_people + ', check_in : ' + consultReservation.check_in +
              ', nights : ' + consultReservation.nights + ', room_rate : ' + consultReservation.room_rate)
        } else {
            // if (consultReservation.sabre_id === '387411' && consultReservation.room_code === 'HYATT PRIVE ADPR 2 TWIN BEDS') {
            console.log('[ ', now.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) , ' ] #### consultReservationOfferPrice no : ' + consultReservation.no + ', chat_id : ' + consultReservation.chat_id + ', sabre_id : ' + consultReservation.sabre_id +
            ', room_code : ' + consultReservation.room_code + 'room_name : ' + consultReservation.room_name +
                ', number_of_people : ' + consultReservation.number_of_people + ', check_in : ' + consultReservation.check_in +
                ', nights : ' + consultReservation.nights + ', room_rate : ' + consultReservation.room_rate)
            await SabreService.saveOfferPriceHist(consultReservation)
            // }
        }
    }
}

async function getFilteredReservations() {
  const { data, error } = await supabase.from('consult_reservatioin_offer_price_view')
      .select('*');
  if (error) {
    throw new Error(`Supabase query error (priceAlarmManagement): ${error.message}`);
  }
  return data.map(row =>
      Object.fromEntries(
          Object.entries(row).map(([key, value]) => [
              key,
              key === 'room_rate' || key === 'offer_price' ? parseFloat(value) : value
          ])
      )
  )
}
module.exports = {
    consultReservationOfferPrice,
}
