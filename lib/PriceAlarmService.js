const cron = require('node-cron')
const {consultReservationOfferPrice} = require('../routes/ota/consultReservationOfferPrice')
let running = false;

cron.schedule('0 9 * * 1-5', async () => {
// async function runBatch() {
        if (running) return;
        running = true;

        console.log('running : ', running)
        const now = new Date()
        console.log(`#[ ${now.toLocaleString('ko-KR', {timeZone: 'Asia/Seoul'})} ] 배치 작업 시작 !`)

        try {
            await processBatchJob()
            console.log(`#[ ${now.toLocaleString('ko-KR', {timeZone: 'Asia/Seoul'})} ] 배치 작업 완료 !`)
        } catch (error) {
            console.error(`#[ ${now.toLocaleString('ko-KR', {timeZone: 'Asia/Seoul'})} ] 배치 작업 실패 T-T: `, error)
        } finally {
            running = false;
        }
}, {
    timezone: 'Asia/Seoul'
})
// }
// runBatch()

// console 배치 테스트시
// if (require.main === module) {
//     runBatch();
// }

async function processBatchJob() {
    await consultReservationOfferPrice()
}
