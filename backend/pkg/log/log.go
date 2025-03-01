package log

// TODO: 로그 설정 확장시 사용할 구성 미리 생성, 나중에 지워질 수 있음
type Config struct{}

// TODO: 로그 설정 확장시 구현, 로그 설정 변경 로직
func SetLogger(cfg *Config) error {
	return nil
}
