import { City } from './types';

export const PROVINCIAL_CAPITALS: City[] = [
  { name: '北京', lat: 39.9042, lng: 116.4074 },
  { name: '上海', lat: 31.2304, lng: 121.4737 },
  { name: '天津', lat: 39.0842, lng: 117.2009 },
  { name: '重庆', lat: 29.5630, lng: 106.5516 },
  { name: '石家庄', lat: 38.0428, lng: 114.5149 },
  { name: '太原', lat: 37.8706, lng: 112.5489 },
  { name: '呼和浩特', lat: 40.8426, lng: 111.7492 },
  { name: '沈阳', lat: 41.8057, lng: 123.4315 },
  { name: '长春', lat: 43.8171, lng: 125.3235 },
  { name: '哈尔滨', lat: 45.8038, lng: 126.5350 },
  { name: '南京', lat: 32.0603, lng: 118.7969 },
  { name: '杭州', lat: 30.2741, lng: 120.1551 },
  { name: '合肥', lat: 31.8206, lng: 117.2272 },
  { name: '福州', lat: 26.0745, lng: 119.2965 },
  { name: '南昌', lat: 28.6820, lng: 115.8579 },
  { name: '济南', lat: 36.6512, lng: 117.1201 },
  { name: '郑州', lat: 34.7466, lng: 113.6253 },
  { name: '武汉', lat: 30.5928, lng: 114.3055 },
  { name: '长沙', lat: 28.2282, lng: 112.9388 },
  { name: '广州', lat: 23.1291, lng: 113.2644 },
  { name: '南宁', lat: 22.8170, lng: 108.3665 },
  { name: '海口', lat: 20.0174, lng: 110.3492 },
  { name: '成都', lat: 30.5728, lng: 104.0668 },
  { name: '贵阳', lat: 26.6470, lng: 106.6302 },
  { name: '昆明', lat: 24.8801, lng: 102.8329 },
  { name: '拉萨', lat: 29.6525, lng: 91.1721 },
  { name: '西安', lat: 34.3416, lng: 108.9398 },
  { name: '兰州', lat: 36.0611, lng: 103.8343 },
  { name: '西宁', lat: 36.6171, lng: 101.7782 },
  { name: '银川', lat: 38.4872, lng: 106.2309 },
  { name: '乌鲁木齐', lat: 43.8256, lng: 87.6168 },
  { name: '台北', lat: 25.0330, lng: 121.5654 },
  { name: '香港', lat: 22.3193, lng: 114.1694 },
  { name: '澳门', lat: 22.1987, lng: 113.5439 }
];

// Default fallback speed (km/min) for initial calculations if API fails or for fallback
export const ESTIMATED_HSR_SPEED_KM_MIN = 250 / 60; 
