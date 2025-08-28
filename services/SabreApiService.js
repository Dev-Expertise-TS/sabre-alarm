const axios = require('axios');

class SabreApiService {
    constructor(config) {
        this.config = config;
    }

    /**
     * 요청 바디 생성
     * @private
     */
    _buildRequestBody(params) {
        const requestBody = {
            GetHotelDetailsRQ: {
                POS: {
                    Source: {
                        PseudoCityCode: this.config.PSEUDO_CITY_CODE
                    }
                },
                SearchCriteria: {
                    HotelRefs: {
                        HotelRef: {
                            HotelCode: params.HotelCode,
                            CodeContext: this.config.CODE_CONTEXT
                        }
                    },
                    RateInfoRef: {
                        CurrencyCode: params.CurrencyCode,
                        PrepaidQualifier: this.config.PREPAID_QUALIFIER,
                        ConvertedRateInfoOnly: true, // 세이버에서 원래 통화 정보도 함께 응답 요청
                        StayDateTimeRange: {
                            StartDate: params.StartDate,
                            EndDate: params.EndDate
                        },
                        Rooms: {
                            Room: [{
                                Index: this.config.DEFAULT_ROOM_INDEX,
                                Adults: parseInt(params.Adults)
                            }]
                        }
                    }
                }
            }
        };
        /*
            "PrepaidQualifier"파라미터는  "ExcludePrepaid" 로 설정
            "ExactMatchOnly" 변수도 TRUE 값으로 설정
            되어 있어야, 세이버 360 단말에서 조회히는 조건과 동일한 요금이 조회 됩니다.

            API, ZP3, VMC, TLC, H01,S72 는 ture로 조회 가능
            다만,

            "ExactMatchOnly" 변수가  FALSE 로 설정되어야 조회가 되는 코드는 아래와 같습니다.

            XLO, PPR, FAN, WMP, HPM, TID (STP는 세팅중)
            따라서 2개 변수를 조정하여 요금조회가 일치하는 API, ZP3, VMC, TLC, H01,S72 에 대해서만 캘린더 요금 조회가 가능하도록 하고,

            "ExactMatchOnly" 변수가  FALSE 로 되어 있어야 조회되는
            XLO, PPR, FAN, WMP, HPM, TID 코드는 조회가 되지 않도록 해야 할 것 같습니다. (2개 변수 조정해두면 자연스럽게 조회는 되지 않을 것 같습니다.)

            XLO, PPR, FAN, WMP, HPM, TID 코드들이 "ExactMatchOnly" 가 true 인 상태에서 조회가 안되는 이유는
            추정컨대  해당호텔에서 E66L PCC 에는 XLO, PPR, FAN, WMP, HPM, TID 코드를 붙여서 보내지 않아서로 보입니다.
            요금에 태그가 없으므로 TRUE 상태에서는 조회가 안되고, FALSE 인 상태에서 일반요금과 뒤섞여서 조회 중
            정리하면,
            2개 변수를 조정해서 세이버 단말기와 일치하는 호텔(코드)에 대해서만 캘린더 요금조회 가능하도록 하고,
            그 외 호텔들은 각 컨소시아에 연락해서 E66L 에서 조회하는 요금에서 해당 코드만 볼 수 있도록 조정해 달라고 요청해서 자연스럽게 조회가 되도록 풀어야 할 것 같습니다.
            (테스트는 일전에 신철호님이 포스트맨 정보 주신 걸로 JSON 본문 변경해서 준연님과 비교 했습니다.)
            https://tidesquareworkspace.slack.com/archives/C07SWB02A7Q/p1747809799407399?thread_ts=1747184153.294609&cid=C07SWB02A7Q
        */

        // 요금 플랜 코드 유효성 검증
        const hasValidRatePlanCode = params.RatePlanCode &&
            (Array.isArray(params.RatePlanCode) ? params.RatePlanCode.length > 0 : params.RatePlanCode.trim());

        if (hasValidRatePlanCode) {
            let rawRatePlanCodes = Array.isArray(params.RatePlanCode)
                ? params.RatePlanCode.map(code => code.trim())
                : [params.RatePlanCode.trim()];

            // 조건 필터링
            const alwaysExactMatchCodes = ['API', 'ZP3', 'VMC', 'TLC', 'H01', 'S72'];
            const disallowedCodes = ['XLO', 'PPR', 'FAN', 'WMP', 'HPM', 'TID', 'STP'];

            // ExactMatchOnly: 지정된 6개 코드만 있을 경우 true, 그 외는 false
            const isAllExactMatch = rawRatePlanCodes.every(code => alwaysExactMatchCodes.includes(code));
            const containsDisallowed = rawRatePlanCodes.some(code => disallowedCodes.includes(code));

            if (containsDisallowed) {
                console.warn('[Sabre요청 차단] 불허된 rate_plan_code 포함 → 요청 중단');
                throw new Error('해당 요금 플랜 코드는 요금 조회가 불가능합니다. (https://tidesquareworkspace.slack.com/archives/C07SWB02A7Q/p1747809799407399?thread_ts=1747184153.294609&cid=C07SWB02A7Q)');
            }

            const ratePlanCandidates = rawRatePlanCodes.map(code => ({ RatePlanCode: code }));

            requestBody.GetHotelDetailsRQ.SearchCriteria.RateInfoRef.RatePlanCandidates = {
                ExactMatchOnly: isAllExactMatch,
                RatePlanCandidate: ratePlanCandidates
            };

            console.log(`[Sabre요청] ${ratePlanCandidates.length > 1 ? '다중 요금코드' : '단일 요금코드'} 요금 플랜 조회: [${rawRatePlanCodes.join(', ')}], ExactMatchOnly: ${isAllExactMatch}`);
        } else {
            // rate_code가 없는 경우 → 전체 요금 플랜 조회 가 가능하지만, 정확성을 위해 요금 조회 불가 처리
            requestBody.GetHotelDetailsRQ.SearchCriteria.RateInfoRef.RatePlanCandidates = {
                ExactMatchOnly: params.ExactMatchOnly === true,
                RatePlanCandidate: [{}]
            };

            console.log('[Sabre요청] 모든 요금 플랜 조회');
        }

        return requestBody;
    }

    /**
     * 호텔 상세 정보 조회
     * @param {Object} params - 조회 파라미터
     * @param {string} token - API 인증 토큰
     * @returns {Promise<Object>} 호텔 상세 정보
     */
    async getHotelDetails(params, token) {

        const headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };

        const requestBody = this._buildRequestBody(params);
        console.log('[Sabre요청] 호텔 상세 정보 조회 시작(파라미터):', {
            hotelCode: params.HotelCode,
            startDate: params.StartDate,
            endDate: params.EndDate,
            currencyCode: params.CurrencyCode,
            ratePlanCode: params.RatePlanCode,
            adults: params.Adults,
            exactMatchOnly: params.ExactMatchOnly,
            // headers
        });

        console.log('[Sabre요청] 요청 바디:', JSON.stringify(requestBody, null, 2));

        try {
            const response = await axios.post(
                this.config.API_URL,
                requestBody,
                { headers, timeout: 15000 // 15초 타임아웃
                }
            );

            return response.data;
        } catch (error) {
            throw this._handleError(error);
        }
    }

    /**
     * 호텔 상세 정보 조회 파라곤 응답 변환
     * @param {Object} params - 조회 파라미터
     * @param {string} token - API 인증 토큰
     * @returns {Promise<Object>} 호텔 상세 정보
     */
    async getHotelDetailsConvertParagon(params, token) {

        const headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };

        const requestBody = this._buildRequestBody(params);
        console.log('[Sabre요청] 호텔 상세 정보 조회 시작(파라미터):', {
            hotelCode: params.HotelCode,
            startDate: params.StartDate,
            endDate: params.EndDate,
            currencyCode: params.CurrencyCode,
            ratePlanCode: params.RatePlanCode,
            adults: params.Adults,
            exactMatchOnly: params.ExactMatchOnly,
            // headers
        });

        console.log('[Sabre요청] 요청 바디:', JSON.stringify(requestBody, null, 2));

        try {
            const response = await axios.post(
                this.config.API_URL,
                requestBody,
                { headers,
                    timeout: 15000 // 15초 타임아웃
                }
            );

            return this._convertSabreResponse(response.data, params);
        } catch (error) {
            throw this._handleError(error);
        }
    }

    /**
     * Sabre API 응답 형식 변환
     * @private
     */
    _convertSabreResponse(sabreResponse, requestParams) {
        const getHotelDetailsRS = sabreResponse?.GetHotelDetailsRS;

        if (!getHotelDetailsRS || getHotelDetailsRS.ApplicationResults?.status !== 'Complete') {
            throw new Error('호텔 정보 조회가 완료되지 않았습니다. status is not "Complete"');
        }

        const hotelInfo = getHotelDetailsRS.HotelDetailsInfo;
        if (!hotelInfo) {
            throw new Error('호텔 상세 정보가 없습니다. GetHotelDetailsRS.HotelDetailsInfo is null or undefined');
        }

        // 호텔 기본 정보
        const hotelName = hotelInfo.HotelInfo?.HotelName || '';

        // 룸 정보 변환
        const roomDescriptions = this._extractRoomDescriptions(hotelInfo.HotelRateInfo);

        return {
            propertyNameKor: hotelName,  // 한글명은 별도 DB나 매핑 테이블 필요
            propertyNameEng: hotelName,
            sabreId: hotelInfo.HotelInfo?.SabreHotelCode || '',
            destinationKor: "",
            destinationEng: "",
            cityKor: "",
            cityEng: "",
            roomDescriptions: roomDescriptions
        };
    }

    /**
     * 룸 정보 추출 및 변환
     * @private
     */
    _extractRoomDescriptions(hotelRateInfo) {
        if (!hotelRateInfo?.Rooms?.Room) {
            return [];
        }

        const rooms = Array.isArray(hotelRateInfo.Rooms.Room)
            ? hotelRateInfo.Rooms.Room
            : [hotelRateInfo.Rooms.Room];

        const roomDescriptions = [];

        rooms.forEach(room => {
            const ratePlans = room.RatePlans?.RatePlan || [];
            const ratePlanArray = Array.isArray(ratePlans) ? ratePlans : [ratePlans];

            ratePlanArray.forEach(ratePlan => {
                // 가격 정보 추출
                const price = this._extractPrice(ratePlan);

                // 취소 정책 정보 추출
                const cancelDeadline = this._extractCancelDeadline(ratePlan);

                // 룸 설명 텍스트 생성 (roomDescriptionText)
                const textArray = room.RoomDescription?.Text || [];
                const textArrayNormalized = Array.isArray(textArray) ? textArray : [textArray];
                const roomDescriptionText = textArrayNormalized.join(' ');

                // 룸명 (roomName)
                const roomName = `${ratePlan.ProductCode || ''} - ${roomDescriptionText}`.trim()

                // 룸 타입 코드 (roomCode)
                const roomCodeFromRoomType = room.RoomType
                    || room.RoomDescription?.Name
                    || 'There is no roomType'; // 없을 경우엔 문자열 fallback

                roomDescriptions.push({
                    price: price,
                    roomCode: roomCodeFromRoomType,
                    roomName: roomName,
                    roomDescription: roomDescriptionText,
                    cancelDeadLine: cancelDeadline
                });
            });
        });

        return roomDescriptions;
    }

    /**
     * 가격 정보 추출 (KRW 조회 시 ConvertedRateInfo 우선)
     * @private
     */
    _extractPrice(ratePlan) {
        // ConvertedRateInfo가 있으면 변환된 금액 사용 (KRW 조회 시)
        if (ratePlan.ConvertedRateInfo?.AmountAfterTax) {
            // KRW는 소수점 없이 정수로 처리
            return parseInt(ratePlan.ConvertedRateInfo.AmountAfterTax);
        }

        // ConvertedRateInfo가 없으면 RateInfo 확인 (USD 등 원본 통화)
        if (ratePlan.RateInfo?.AmountAfterTax) {
            return Math.round(parseFloat(ratePlan.RateInfo.AmountAfterTax));
        }

        console.warn('[가격추출] 가격 정보를 찾을 수 없습니다:', {
            hasConvertedRateInfo: !!ratePlan.ConvertedRateInfo,
            hasRateInfo: !!ratePlan.RateInfo
        });

        return 0;
    }

    /**
     * 취소 마감일 추출 (YYYYMMDD 형식)
     * @private
     */
    _extractCancelDeadline(ratePlan) {
        // RateInfo 또는 ConvertedRateInfo에서 CancelPenalties 확인
        const rateInfo = ratePlan.ConvertedRateInfo || ratePlan.RateInfo;

        if (!rateInfo?.CancelPenalties?.CancelPenalty) {
            return '';
        }

        const cancelPenalties = Array.isArray(rateInfo.CancelPenalties.CancelPenalty)
            ? rateInfo.CancelPenalties.CancelPenalty
            : [rateInfo.CancelPenalties.CancelPenalty];

        // 첫 번째 취소 정책의 마감일 추출
        const firstPenalty = cancelPenalties[0];

        // Refundable이 false면 환불 불가
        if (firstPenalty?.Refundable === false) {
            return ''; // 환불 불가
        }

        if (firstPenalty?.Deadline) {
            const deadline = firstPenalty.Deadline;

            // 직접 날짜 문자열이 있는 경우 (YYYY-MM-DD 형식)
            if (typeof deadline === 'string') {
                return deadline.replace(/-/g, '');
            }

            // Offset 정보로 계산이 필요한 경우 (체크인 날짜 기준)
            if (deadline.OffsetTimeUnit && deadline.OffsetUnitMultiplier && deadline.OffsetDropTime === 'BeforeArrival') {
                // StartDate(체크인 날짜)에서 offset 만큼 빼서 계산
                const startDate = rateInfo.StartDate;
                if (!startDate) {
                    console.warn('[취소마감일] StartDate가 없어 취소 마감일 계산 불가');
                    return '';
                }

                // YYYY-MM-DD 형식의 날짜를 Date 객체로 변환
                const checkInDate = new Date(startDate);

                // offset 계산 (Day 단위)
                if (deadline.OffsetTimeUnit === 'Day') {
                    const offsetDays = parseInt(deadline.OffsetUnitMultiplier) || 0;
                    checkInDate.setDate(checkInDate.getDate() - offsetDays);
                }
                // Hour 단위 처리 (필요시)
                else if (deadline.OffsetTimeUnit === 'Hour') {
                    const offsetHours = parseInt(deadline.OffsetUnitMultiplier) || 0;
                    checkInDate.setHours(checkInDate.getHours() - offsetHours);
                }

                // YYYYMMDD 형식으로 변환
                const year = checkInDate.getFullYear();
                const month = String(checkInDate.getMonth() + 1).padStart(2, '0');
                const day = String(checkInDate.getDate()).padStart(2, '0');

                return `${year}${month}${day}`;
            }
        }

        return '';
    }



    /**
     * 에러 처리
     * @private
     */
    _handleError(error) {
        const errorInfo = {
            timestamp: new Date().toISOString(),
            requestId: Math.random().toString(36).slice(2, 11)
        };

        if (error.response) {
            // Sabre API 응답 에러
            const sabreError = error.response.data?.GetHotelDetailsRS?.ApplicationResults?.Error;

            return {
                ...errorInfo,
                type: 'sabre_api_error',
                message: sabreError?.ErrorMessage || 'Sabre API 오류',
                status: error.response.status,
                sabreErrorCode: sabreError?.ErrorCode,
                sabreErrorType: sabreError?.Type,
                data: error.response.data
            };
        } else if (error.request) {
            // 네트워크 에러
            return {
                ...errorInfo,
                type: 'network_error',
                message: '네트워크 연결 오류',
                error: error.message,
                code: error.code
            };
        } else {
            // 기타 에러
            return {
                ...errorInfo,
                type: 'general_error',
                message: '호텔 정보 조회 중 오류 발생',
                error: error.message,
                stack: error.stack
            };
        }
    }
}

module.exports = SabreApiService;
