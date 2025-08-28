const _ = require('lodash')
const axios = require('axios')

const config = require('../config')
const moment = require('moment/moment')
const BASE_URL = 'https://hotelapi.tidesquare.com'

class ParagonService {
  get axios() {
    return axios.create({
      baseURL: BASE_URL,
      headers: {
        Authorization: 'Bearer ' + config.paragon_token,
        timezone: 'KOREA'
      }
    })
  }

  /**
   * sabre 숙소 룸&가격 정보 조회 (세이버 아이디 조회)
   */
  getParagonSabreSelectRoomsPrice(sabreId, paragonId, checkIn, nights, numberOfPeople) {
    if(checkIn < moment().format('YYYY-MM-DD')){
        console.info('getParagonSabreSelectRoomsPrice checkIn date is before today')
        return null
    }
    let paragonUrl = `/api/v2/premium/search/hotel/rooms?sprHtlCode=${sabreId}&checkIn=${checkIn}&checkOut=${this.getCalculateCheckoutDate(checkIn, nights)}&roomInfo=${numberOfPeople}`
    if(paragonId) {
      paragonUrl = `/api/v2/premium/search/hotel/rooms?htlMasterId=${paragonId}&checkIn=${checkIn}&checkOut=${this.getCalculateCheckoutDate(checkIn, nights)}&roomInfo=${numberOfPeople}`
    }

      const paragonSabrePriceResponse = this.axios.get(paragonUrl, { timeout: 120000 })
          .then(rs => {
              const data = _.get(rs, 'data', {})

              return {
                  propertyNameKor: _.get(data, 'htlNameKr', ''),
                  propertyNameEng: _.get(data, 'htlNameEn', ''),
                  destinationKor: _.get(data, 'nationNameKr', ''),
                  destinationEng: _.get(data, 'nationNameEn', ''),
                  cityKor: _.get(data, 'cityNameKr', ''),
                  cityEng: _.get(data, 'cityNameEn', ''),
                  paragonId: _.get(data, 'htlMasterId', ''),
                  roomDescriptions: _.map(_.get(data, 'roomFareList', []), room => ({
                      price: room.salePrice,
                      roomCode: _.trim(room.roomGradeCode),
                      roomName: room.roomGradeName,
                      roomDescription: room.remarkInfo,
                  }))
              }
          })
          .catch(err => {
              console.error("getParagonSabreSelectRoomsPrice Failed to API room price data : ", err, 'paragonUrl : ', paragonUrl)
              return null // thread safe null or handle the error as needed
          })
      return paragonSabrePriceResponse;
  }

  getCalculateCheckoutDate(checkIn, nights) {
    return moment(checkIn).add(nights, 'd').format('YYYY-MM-DD')
  }
}

module.exports = new ParagonService()
