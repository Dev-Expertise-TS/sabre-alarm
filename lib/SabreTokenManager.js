require("dotenv").config()
const axios = require('axios');

class SabreTokenManager {
    constructor() {
        this.token = null;
        this.expiresAt = null;
        this.clientCredentials = process.env.SABRE_AUTHORIZATION;

        // 클라이언트 인증 정보 검증
        if (!this.clientCredentials) {
            console.error('SABRE_AUTHORIZATION 환경변수가 설정되지 않았습니다.');
        }
    }

    async getValidToken() {
        if (this.isTokenValid()) {
            console.log('기존 토큰 사용');
            return this.token;
        }

        console.log('토큰 갱신 필요');
        return await this.fetchNewToken();
    }

    isTokenValid() {
        const now = new Date();
        const isValid = this.token && this.expiresAt && now < this.expiresAt;

        console.log('토큰 유효성 검사:');
        console.log('- 현재 토큰 존재:', !!this.token);
        console.log('- 만료 시간:', this.expiresAt);
        console.log('- 현재 시간:', now);
        console.log('- 유효 상태:', isValid);

        return isValid;
    }

    async fetchNewToken() {
        try {
            console.log('새 토큰 요청 시작...');

            if (!this.clientCredentials) {
                throw new Error('SABRE_AUTHORIZATION 환경변수가 설정되지 않았습니다.');
            }

            const response = await axios.post('https://api.platform.sabre.com/v2/auth/token',
                'grant_type=client_credentials',
                {
                    headers: {
                        'Authorization': `Basic ${this.clientCredentials}`,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    timeout: 10000 // 10초 타임아웃
                }
            );

            const { access_token, expires_in } = response.data;

            if (!access_token || !expires_in) {
                throw new Error('토큰 응답 데이터가 올바르지 않습니다.');
            }

            this.token = access_token;
            // 12시간(43200초) 여유를 두고 만료 시간 설정
            this.expiresAt = new Date(Date.now() + ((expires_in - 43200) * 1000));

            console.log(`토큰 갱신 완료:`);
            console.log(`- 토큰: ${this.token}`);
            console.log(`- 만료시간: ${this.expiresAt}`);

            return this.token;

        } catch (error) {
            console.error('토큰 요청 실패:');

            if (error.response) {
                console.error('- 상태코드:', error.response.status);
                console.error('- 응답 데이터:', error.response.data);
            } else if (error.request) {
                console.error('- 네트워크 오류:', error.message);
            } else {
                console.error('- 설정 오류:', error.message);
            }

            // 토큰 상태 초기화
            this.token = null;
            this.expiresAt = null;

            throw new Error(`Sabre 토큰 획득 실패: ${error.message}`);
        }
    }

    // 토큰 강제 갱신 메서드 추가
    async forceRefreshToken() {
        console.log('토큰 강제 갱신 시작...');
        this.token = null;
        this.expiresAt = null;
        return await this.fetchNewToken();
    }

    // 토큰 상태 확인 메서드 추가
    getTokenStatus() {
        return {
            hasToken: !!this.token,
            expiresAt: this.expiresAt,
            isValid: this.isTokenValid(),
            timeUntilExpiry: this.expiresAt ? Math.max(0, this.expiresAt.getTime() - Date.now()) : 0
        };
    }
}

const tokenManager = new SabreTokenManager();

async function getSabreToken() {
    try {
        return await tokenManager.getValidToken();
    } catch (error) {
        console.error('getSabreToken 실패:', error.message);
        throw error;
    }
}

// 토큰 상태 확인 함수 추가
function getTokenStatus() {
    return tokenManager.getTokenStatus();
}

// 토큰 강제 갱신 함수 추가
async function forceRefreshToken() {
    return await tokenManager.forceRefreshToken();
}

module.exports = {
    SabreTokenManager,
    getSabreToken,
    getTokenStatus,
    forceRefreshToken
};
