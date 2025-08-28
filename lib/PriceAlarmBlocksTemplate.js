const _ = require('lodash')
const config = require('../config')
const moment = require('moment/moment');
const selectAdminUrl = config.select_admin_url

class priceAlarmBlocksTemplate {
  async setBlocks(consultReservation, apiRow, roomPriceApiData, offerPriceSuggestions, previousOfferPrice) {
    const sabre_id = consultReservation.sabre_id
    const user_name = consultReservation.user_id
    const consult_date = moment(consultReservation.consult_date).format('YYYY-MM-DD')
    const property_name = _.isEmpty(consultReservation.property_name) ? roomPriceApiData.propertyNameEng : roomPriceApiData.property_name
    const room_code = consultReservation.room_code
    const room_name = apiRow.roomName
    const room_rate = _.toSafeInteger(consultReservation.room_rate).toLocaleString('ko-KR', { maximumFractionDigits: 0 })
    const offer_price = _.toSafeInteger(apiRow.price).toLocaleString('ko-KR', { maximumFractionDigits: 0 })
    const difference_amount = _.toSafeInteger(consultReservation.room_rate) - _.toSafeInteger(apiRow.price)
    const difference_amount_str = difference_amount.toLocaleString('ko-KR', { maximumFractionDigits: 0 })
    // const location = roomPriceApiData.destinationEng + ', ' + roomPriceApiData.cityEng
    const offerPriceSuggestionsStr = offerPriceSuggestions > 1 ? `* 제안 횟수 - ${offerPriceSuggestions}` : ''
    // const previousOfferPriceStr = _.toSafeInteger(previousOfferPrice) > 0 ? `* 이전 제안 가격 - ${previousOfferPrice.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}` : ''

    let out = []
    out.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `<@${user_name}> 님, 안녕하세요!`
      }
    })
    out.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${consult_date}일* 고객(*${consultReservation.chat_id}*)님과 상담한 데이터 중 더 저렴한 숙소 가격을 찾았어요.`
      }
    })
    out.push({
      type: 'divider'
    })
    out.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `* ${sabre_id}\n* <${selectAdminUrl}apps/consult-reservation|${property_name}>\n* ${room_code}\n* ${room_name}\n* 상담 가격 - ${room_rate}\n* 제안 가격 - ${offer_price}\n* 가격 차이 - ${difference_amount_str}\n${offerPriceSuggestionsStr}`
      },
      accessory: {
        type: 'image',
        image_url: 'https://api.slack.com/img/blocks/bkb_template_images/tripAgent_3.png',
        alt_text: `${property_name} thumbnail`
      }
    })
    out.push({
      type: 'context',
      elements: [
        {
          type: 'image',
          image_url: 'https://api.slack.com/img/blocks/bkb_template_images/tripAgentLocationMarker.png',
          alt_text: 'Location Pin Icon'
        },
        {
          type: 'plain_text',
          emoji: true,
          text: '*Location:* '
        }
      ]
    })
    out.push({
      type: 'divider'
    })

    return out
  }
}

// eslint-disable-next-line new-cap
module.exports = new priceAlarmBlocksTemplate()
