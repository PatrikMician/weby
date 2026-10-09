# RoboArm v1.0 – 6-DOF Robotic Arm

An open-source 6-axis robotic arm powered by **Arduino**, featuring I2C servo driving (**PCA9685**), real-time **LCD status display**, physical **joystick controls**, and a **Web Serial** browser interface.

---

## Features

* **6 Degrees of Freedom (6-DOF):** Full control over base rotation, shoulder, elbow, wrist pitch, wrist roll, and gripper/claw.
* **Dual Control Modes:**
  * **Physical Joysticks:** Tactile control using two 2-axis analog joysticks with pushbuttons.
  * **Web Serial Interface:** Control servo angles directly from any modern browser (Chrome, Edge) via USB without extra software.
* **Real-time LCD Feedback:** 16x2 I2C display shows current angles for all joint servos ($S_1$ to $S_5$) and operational messages.
* **Smart Motion Control:** Smooth stepping for servo protection, EEPROM position saving, and automated routine execution ("Dance mode").

---

## 🛠️ Hardware Requirements

| Component | Quantity | Description |
| :--- | :---: | :--- |
| **Arduino (Nano / Uno / Every)** | 1 | Main microcontroller |
| **PCA9685 PWM Driver** | 1 | 16-Channel 12-bit I2C Servo Driver (`0x40`) |
| **16x2 LCD with I2C Adapter** | 1 | Character display (`0x27`) |
| **Analog Joystick Modules** | 2 | Dual-axis joysticks with pushbuttons (e.g., KY-023) |
| **Servomotors** | 6 | Standard 180° servos (e.g., MG996R or SG90) |
| **External 5V Power Supply** | 1 | Dedicated high-current power supply for servos |

---

## Controls Summary

* **Left Joystick:**
  * **X-Axis:** Elbow (Servo 3)
  * **Y-Axis:** Shoulder (Servo 4)
  * **Button (SW1):** Toggle Gripper Open / Closed (Servo 0)
* **Right Joystick:**
  * **X-Axis (Default):** Base Rotation (Servo 5)
  * **Button (SW2):** Toggle Wrist Mode (Switches controls to Wrist Roll $S_1$ / Wrist Pitch $S_2$)
* **Combo Action (SW1 + SW2 pressed together):** Trigger automated routine ("Dance mode").

---

## Quick Start Guide

### 1. Hardware Assembly & Wiring
1. Mount the servos to your 6-DOF robotic arm frame.
2. Connect the **PCA9685** driver and the **I2C LCD** to the Arduino via the **I2C bus** (`A4` = SDA, `A5` = SCL).
3. Connect the analog joysticks to the analog pins (`A0`–`A3`) and digital pins (`D2`, `D4`) as configured in the source code.
4. **Important:** Power the servos using an external 5V power supply connected to the PCA9685 terminal block. *Do not power servos directly from the Arduino.*

### 2. Uploading the Code
1. Open the Arduino IDE.
2. Install the required libraries via the **Library Manager** (`Ctrl+Shift+I`):
   * `Wire`
   * `Adafruit_PWMServoDriver`
   * `LiquidCrystal_I2C`
   * `EEPROM`
3. Open `RoboArm.ino`, select your Arduino board and COM port, and click **Upload**.

### 3. Web Interface Setup
1. Connect the Arduino to your PC via USB.
2. Open `index.html` in a Web Serial supported browser (Google Chrome, MS Edge, or Opera).
3. Click the **Connect** button on the web page and select your Arduino's serial port.
4. Move the sliders to control the robotic arm in real time.

---

## Project Structure

```text
├── src/
│   └── RoboArm.ino      # Arduino firmware C++ code
├── index.html           # Web Serial dashboard layout
├── style.css            # Styling for the web interface
└── script.js           # Web Serial API communication logic
