#define FLOAT_SWITCH_1 32
#define FLOAT_SWITCH_2 33

void setup() {
  Serial.begin(115200);

  pinMode(FLOAT_SWITCH_1, INPUT_PULLUP);
  pinMode(FLOAT_SWITCH_2, INPUT_PULLUP);
}

void loop() {
  int s1 = digitalRead(FLOAT_SWITCH_1);
  int s2 = digitalRead(FLOAT_SWITCH_2);

  // LOW = at rest (float hanging down / not floating)
  // HIGH = triggered (float risen with water level)

  Serial.printf("Switch1 (GPIO32): %s | Switch2 (GPIO33): %s\n",
    s1 == LOW ? "at rest" : "TRIGGERED",
    s2 == LOW ? "at rest" : "TRIGGERED");

  delay(300);
}