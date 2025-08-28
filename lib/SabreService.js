require("dotenv").config()
const _ = require('lodash')
const AlarmSend = require('./AlarmSend')
const priceAlarmSetBlocks = require('./PriceAlarmBlocksTemplate')
const { createClient } = require("@supabase/supabase-js")
const moment = require("moment");
const sabreTokenManager = require('../lib/SabreTokenManager')
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

const PRICE_DIFFERENCE = 5000

const SabreApiService = require('../services/SabreApiService')
const {getRatePlanParams} = require("../services/getRatePlanParams");
const SABRE_CONFIG = {
    API_URL: 'https://api.platform.sabre.com/v3.0.0/get/hoteldetails',
    PSEUDO_CITY_CODE: 'LD38',
    CODE_CONTEXT: 'SABRE',
    PREPAID_QUALIFIER: 'ExcludePrepaid',
    DEFAULT_ROOM_INDEX: 1,
    EXCHANGE_RATE_API_KEY: process.env.EXCHANGE_RATE_API_KEY || 'c2d999904f62427a9dd572469c7e89f9',
}

const sabreApiService = new SabreApiService(SABRE_CONFIG);

class SabreService {

  async saveOfferPriceHist(consultReservation) {
    const apiRoomsPrices = await this.getSabreApiRoomsPrices(
        consultReservation.sabre_id,
        consultReservation.check_in,
        consultReservation.nights,
        consultReservation.number_of_people);

    if (!_.isEmpty(apiRoomsPrices)) {

      if (_.size(apiRoomsPrices.roomDescriptions) > 0) {

          const room = apiRoomsPrices.roomDescriptions.filter((room) => {
            room.roomCode = room.roomCode.trim()
            room.roomName = room.roomName.trim()
              if (room.roomCode === consultReservation.room_code && room.roomName === consultReservation.room_name) {
                return room
              }
          })

          if (room.length === 1) {
              try {
                  // 상담가격과 sabre <> sabre api 가격과 같지 않을 경우 이력 저장
                  if (room[0].price !== consultReservation.room_rate) {
                      await this.insertOfferPriceHist(consultReservation, room[0])

                      if (_.toSafeInteger(consultReservation.offer_price) !== room[0].price) {

                          // 상담가격 - 저렴한 정책 가격(5000원) 보다 작을 경우, 즉 API 가격이 더 저렴하면 상담가격 업데이트
                          if ((_.toSafeInteger(consultReservation.room_rate) - PRICE_DIFFERENCE) >= room[0].price
                              && consultReservation.offer_price_suggestions === 0
                              && (_.toSafeInteger(consultReservation.offer_price) < 1)) {
                              await this.updateConsultReservationNAlarmSend(consultReservation, room[0], apiRoomsPrices, 1)

                              // 상담가격 보다 저렴한 가격을 제안했던 금액(offer_price)이 있다면, 이 후 부터는 제안한 가격을 기준으로 5000원 더 저렴한 가격 데이터가 들어 왔을 경우만 추가 재 제안
                          } else if (_.toSafeInteger(consultReservation.offer_price) > PRICE_DIFFERENCE && consultReservation.offer_price_suggestions > 0) {
                              // 2차 제안
                              if ((_.toSafeInteger(consultReservation.offer_price) - PRICE_DIFFERENCE) >= room[0].price) {
                                  await this.updateConsultReservationNAlarmSend(consultReservation, room[0], apiRoomsPrices, consultReservation.offer_price_suggestions + 1)
                              }
                          } else {
                              console.info('not send alarm - no : ', consultReservation.no, ' chat_id : ', consultReservation.chat_id, ' sabre_id : ', consultReservation.sabre_id)
                          }
                      }
                  }
              } catch (e) {
                  console.error('Error in saveOfferPriceHist:', e);
              }
          } else {
            console.info('getSelectRoomsPrice room count - ', room.length, ' roomCode - ', consultReservation.room_code, ' roomName - ', consultReservation.room_name);
            if (room.length > 1) console.error('getSelectRoomsPrice room count 2~ => ', room.length);
          }
      }
    } else {
        console.info('getSelectRoomsPrice-apiRoomsPrices is empty. - ', consultReservation.sabre_id, ' check_in : ', consultReservation.check_in);
    }
  }

    async getSabreApiRoomsPrices(sabre_id, check_in, nights, number_of_people) {
        // 날짜 체크를 먼저 수행
        if (!moment(check_in).isSameOrAfter(moment(), 'day')) {
            console.info(`[SKIP] Check-in date (${check_in}) is in the past for sabre_id: ${sabre_id}`);
            return [];
        }

        const MAX_RETRIES = 1; // 최대 재시도 횟수

        const checkOutDate = moment(check_in).add(nights, 'd').format('YYYY-MM-DD');
        // const rs = await SabreApiService.getHotelDetailsConvertParagon()

        const params = await getRatePlanParams({sabre_id, check_in, check_out: checkOutDate, number_of_people});

        // 재시도를 위한 for 루프
        // for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        //     try {
        //         console.log(`[ATTEMPT ${attempt}/${MAX_RETRIES}] Calling Sabre API for sabre_id: ${sabre_id}`);
        //
        //         // const token = "T1RLAQLkQYO0p/sznbcmKLkfT3kCfe/Lh5Q7TBOQUMrUT2+pNhCvnXU8fj9aLczJ1pKOsM+ZAADQzLHVwRyg9IA970L4xDkIWsOz5qgvwQ5iyTyEl+Vuqa2KOOTrduCNF4+o3juoJoVmF6nV4Ut7PCz9uvQxcPBYVmbf+5KaHYrO0Ku0NHtV9F9elJ1vt8F4LWqMOO9vIngQFphNLSjDl/YgSfSoo6DSZwvbq1gIEbcEVu75OwvlqpNXEPdsa9hlkMPi/eH8iAmoXpdc03AYA+fNsyHEGMGFyJYjgd28lB8FLo6edNKtxSCX6aiaNRo3nYh4z8dB8+tQlCIr3VbZULcq3qQdl+loVw**";
        //         const token = await sabreTokenManager.getSabreToken();
        //
        //         const sabrePriceResponse = await sabreApiService.getHotelDetailsConvertParagon(params, token)
        //
        //         console.log(`[SUCCESS] Sabre API call successful for sabre_id: ${sabre_id}. Room descriptions count: ${sabrePriceResponse?.roomDescriptions?.length || 0}`);
        //         return sabrePriceResponse;
        //
        //     } catch (error) {
        //         // 3. 재시도 가능한 오류 (타임아웃 또는 5xx 서버 오류)
        //         const isTimeout = error.code === 'ECONNABORTED';
        //         const isServerError = error.response && error.response.status >= 500;
        //
        //         if (isTimeout || isServerError) {
        //             console.warn(`[RETRYABLE ERROR] Attempt ${attempt} failed for sabre_id: ${sabre_id}. Reason: ${isTimeout ? 'Timeout' : `Server Error ${error.response.status}`}.`);
        //
        //             // 마지막 시도였다면 더 이상 재시도하지 않고 종료
        //             if (attempt === MAX_RETRIES) {
        //                 console.error(`[FAILURE] Max retries (${MAX_RETRIES}) reached for sabre_id: ${sabre_id}.`);
        //                 break; // 루프 종료
        //             }
        //
        //             // 지수 백오프 (Exponential Backoff) 적용
        //             const delay = 1500 * (2 ** (attempt - 1)); // 1.5초, 3초, 6초 대기시간 계산
        //             console.log(`Retrying in ${delay / 1000} seconds...`);
        //             await new Promise(resolve => setTimeout(resolve, delay));
        //
        //         } else {
        //             // 4. 재시도 불가능한 그 외 오류 (네트워크 문제 등)
        //             console.error(`[UNRECOVERABLE ERROR] Error fetching Sabre price for sabre_id: ${sabre_id}. Error: ${error.message}`);
        //             return []; // 즉시 종료
        //         }
        //     }
        // }

        try {
            const token = await sabreTokenManager.getSabreToken();
            const sabrePriceResponse = await sabreApiService.getHotelDetailsConvertParagon(params, token);

            console.debug(`[SabreAPI] Success for sabre_id=${sabre_id} , rooms=${sabrePriceResponse?.roomDescriptions?.length || 0}`);
            return sabrePriceResponse || [];

        } catch (error) {
            console.error(`[SabreAPI] Failed for sabre_id=${sabre_id}, reason=${error.message}`);
            return [];
        }

    }

    async updateConsultReservationNAlarmSend(consultReservation, apiRow, roomPriceApiData, offerPriceSuggestions) {
        try {
          let previousOfferPrice = 0
          if (offerPriceSuggestions > 1) {
              previousOfferPrice = consultReservation.offer_price
          }

          const {error} = await supabase
              .from('consult_reservation')
              .update({
                offer_price: apiRow.price,
                offer_price_suggestions: offerPriceSuggestions,
                updated_at: new Date().toISOString()
              })
              .eq('no', consultReservation.no);
          if (error) {
            console.error('Update failed:', error.message);
          } else {
            console.log('Update successful and send Alarm Slack! - no : ', consultReservation.no, ' chat_id : ', consultReservation.chat_id, ' offer_price_suggestions : ', offerPriceSuggestions);
            await AlarmSend.chatSendMessage(await priceAlarmSetBlocks.setBlocks(consultReservation, apiRow, roomPriceApiData, offerPriceSuggestions, previousOfferPrice))
          }
        } catch (e) {
          console.log('Update consult_reservation no - ', consultReservation.no, ', chat_id:', consultReservation.chat_id,
              ', sabre_id:', consultReservation.sabre_id, ', room_code:', consultReservation.room_code, ', room_name:', consultReservation.room_name,
              ', number_of_people:', consultReservation.number_of_people, ', check_in:', consultReservation.check_in, ', nights:', consultReservation.nights,
              '\n, Update offer_price(apiRowPrice) : ', apiRow.price, ', room_rate : ', consultReservation.room_rate
          );
          console.error('Error updateConsultReservationNAlarmSend updating consult_reservation:', e);
        }
    }

  async insertOfferPriceHist(consultReservation, apiRow) {
    // const {data, error} = await supabase
    //     .from('offer_price_hist')
    //     .select('count', {count: 'exact'})
    //     .eq('chat_id', consultReservation.chat_id)
    //     .eq('sabre_id', consultReservation.sabre_id)
    //     .eq('room_code', consultReservation.room_code)
    //     .eq('room_name', consultReservation.room_name)
    //     .eq('number_of_people', consultReservation.number_of_people)
    //     .eq('check_in', consultReservation.check_in)
    //     .eq('nights', consultReservation.nights)
    //     .eq('offer_price', apiRow.price)
    //     .gte('created_at', new Date().toISOString().split('T')[0] + ' 00:00:00')
    //     .lte('created_at', new Date().toISOString().split('T')[0] + ' 23:59:59')
    //     .limit(1);
    //
    // if (error) {
    //   console.error('select Error fetching - offer_price_hist count : ', error);
    // }

    // const duplicateCnt = data.length ? data[0].count : 0;
    // if (duplicateCnt === 0) {
      const { error } = await supabase
          .from('offer_price_hist')
          .insert({
            chat_id: consultReservation.chat_id,
            sabre_id: consultReservation.sabre_id,
            room_code: consultReservation.room_code,
            room_name: consultReservation.room_name,
            number_of_people: consultReservation.number_of_people,
            check_in: consultReservation.check_in,
            nights: consultReservation.nights,
            offer_price: apiRow.price,
          });
      if (error) {
        console.error('offer_price_hist Insert failed : ', error.message);
      } else {
        console.log('offer_price_hist Insert successful - chat_id : ', consultReservation.chat_id, ', sabre_id : ', consultReservation.sabre_id,
            ', room_code : ', consultReservation.room_code, ', room_name : ', consultReservation.room_name,
            ', number_of_people : ', consultReservation.number_of_people, ', check_in : ', consultReservation.check_in,
            ', nights : ', consultReservation.nights, ', offer_price : ', apiRow.price);
      }
    // }
  }

  isInvalid(consultReservation) {
    const { chat_id, sabre_id, room_code, room_name, number_of_people, check_in, nights, room_rate } = consultReservation
    if (_.isEmpty(chat_id)) return 0
    if (_.isEmpty(sabre_id)) return 0
    if (_.isEmpty(room_code)) return 0
    if (_.isEmpty(room_name)) return 0
    if (_.isEmpty(number_of_people)) return 0
    if (_.isEmpty(check_in)) return 0
    if (_.trim(nights) < 1) return 0

    if (_.toSafeInteger(room_rate) < 1) return 0
    if (_.toSafeInteger(number_of_people) < 1) return 0

    return 1
  }
}
module.exports = new SabreService()
