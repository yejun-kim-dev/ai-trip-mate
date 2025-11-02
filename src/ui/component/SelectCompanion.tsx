import React from "react";

const companionsConfig = [
  { key: "friends", label: "친구", description: "" },
  { key: "couple", label: "연인", description: "" },
  { key: "family", label: "가족", description: "" },
  { key: "youth", label: "청소년", description: "만 12세 이상 - 만 18세 미만" },
  { key: "children", label: "어린이", description: "만 12세 미만" },
  { key: "elderly", label: "노약자", description: "" },
];

export default function TripCompanion({ tripData, setTripData }: any) {
  const handleChange = (key: string, delta: number) => {
    setTripData((prev: any) => {
      const currentCount = prev.companions?.[key] || 0;
      const newCount = Math.max(0, currentCount + delta);
      return {
        ...prev,
        companions: {
          ...(prev.companions || {}),
          [key]: newCount,
        },
      };
    });
  };

  const getCompanionCount = (key: string) => {
    return tripData.companions?.[key] || 0;
  };

  return (
    <div className="p-3 bg-white border border-[#D4D4D4] rounded-[10px] shadow-lg mb-6 mx-auto w-[90%] max-w-md mt-4 relative z-30">
      {/* 항목 리스트 */}
      <div className="flex flex-col items-center space-y-3">
        {companionsConfig.map((comp) => (
          <div
            key={comp.key}
            className="flex justify-between items-center bg-white border border-gray-200 shadow-sm"
            style={{
              width: "96%", // ✅ 국가 선택 블록 내부 항목 크기와 동일
              height: "56px",
              padding: "12px 16px",
              borderRadius: "10px",
            }}
            
          >
            {/* 동반자 정보 */}
            <div className="flex flex-col justify-center">
              <span style={{ color: "#1a1a1a", fontWeight: 600, fontSize: "15px" }}>
                {comp.label}
              </span>
              {comp.description && (
                <span
                  style={{
                    fontSize: "8px",
                    color: "#6B7280",
                    marginTop: "2px",
                  }}
                >
                    
                  {comp.description}
                </span>
              )}
            </div>

            {/* 수량 조절 버튼 */}
            <div className="flex items-center space-[24px]">
              <button
                onClick={() => handleChange(comp.key, -1)}
                    style={{
                    width: "28px",
                    height: "28px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#319CE5",
                    background: "transparent",
                    fontSize: "22px",
                    lineHeight: "1",
                }}
                aria-label={`감소 (${comp.label})`}
                disabled={getCompanionCount(comp.key) === 0}
              >
                −
              </button>

              <span
                style={{
                  fontWeight: 600,
                  fontSize: "17px",
                  width: "24px",
                  textAlign: "center",
                  lineHeight: "1",
                }}
              >
                {getCompanionCount(comp.key)}
              </span>

              <button
                onClick={() => handleChange(comp.key, 1)}
                    style={{
                    width: "28px",
                    height: "28px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#319CE5",
                    background: "transparent",
                    fontSize: "22px",
                    lineHeight: "1",
                }}
                aria-label={`추가 (${comp.label})`}
              >
                ＋
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
