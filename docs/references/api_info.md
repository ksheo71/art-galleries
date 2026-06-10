| provider                     | folder              | url                          | api base                                                  |
|------------------------------|---------------------|------------------------------|-----------------------------------------------------------|
| The Art Institute of Chicago | chicago-museum      | https://www.artic.edu/       | https://api.artic.edu/api/v1/                             |
| The Metropolitan Museum      | metropolitan-museum | https://www.metmuseum.org/   | https://collectionapi.metmuseum.org/public/collection/v1/ |
| The Cleveland Museum of Art  | cleveland-museum    | https://www.clevelandart.org | https://openaccess-api.clevelandart.org/api/              |
| V&A East Museum              | vna-east-museum     | https://www.vam.ac.uk/       | https://api.vam.ac.uk/v2/                                 |
| Yale University Art Gallery  | yale-museum         | https://artgallery.yale.edu/ | https://lux.collections.yale.edu/api/                     |
| Harvard Art Museums          | harvard-museum      | https://harvardartmuseums.org/ | https://api.harvardartmuseums.org/ (키 필요 → 동일출처 프록시 /api/harvard/) |
| 국가유산청 (Korea Heritage Service) | korea-heritage      | https://www.khs.go.kr/       | https://www.khs.go.kr/cha/ (키 불필요·CORS 허용. 시대별 건축물(유적건조물). 빌드타임 수집 → data/heritage.json) |
| 국가유산청 (Korea Heritage Service) | korea-artifacts     | https://www.khs.go.kr/       | https://www.khs.go.kr/cha/ (키 불필요·CORS 허용. 시대×유형별 유물(gcodeName=유물: 도자기·조각·회화·금속공예). 빌드타임 수집 → data/artifacts.json) |
| e뮤지엄 (국립박물관 통합)            | emuseum             | https://www.emuseum.go.kr/   | http://www.emuseum.go.kr/openapi/ (키 필요 → 동일출처 프록시 /api/emuseum/. ⚠️http 전용·https 는 4012. 라이브 검색: relic/list·relic/detail·code·img) |