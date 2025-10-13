# 🎮 Earn Pilot - Mobile Gaming App

A complete React Native mobile application built with Expo that allows users to earn reward points by playing engaging mini-games.

## ✨ Features

### 🎯 **4 Engaging Mini-Games**
- **🎨 Color Match Game**: Find matching colors from options (10 pts per round)
- **🖼️ Image Match Game**: Match similar images/emojis (15 pts per round)
- **🧮 Math Quiz Game**: Solve arithmetic problems with streak bonuses (5+ pts)
- **🧠 Memory Pattern Game**: Remember and repeat color sequences (8+ pts)

### 🔧 **Core Features**
- **Authentication System**: Static login with phone number + OTP (123456)
- **Tab Navigation**: Home, Explore, Wallet, Profile pages
- **Theme System**: Complete light/dark mode with system detection
- **Game Management**: Cooldowns, daily limits, high score tracking
- **Points Integration**: Game earnings added to total balance
- **Activity Tracking**: Recent activities feed with game results

### 📱 **Technical Stack**
- **Frontend**: React Native + Expo 52
- **Language**: TypeScript
- **Navigation**: Expo Router
- **State Management**: Zustand
- **Storage**: AsyncStorage
- **UI**: Custom components with animations and gradients
- **Theme**: Dynamic theming with persistent preferences

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- Expo CLI (`npm install -g @expo/cli`)
- iOS Simulator or Android device with Expo Go

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/earn-pilot-app.git
   cd earn-pilot-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

4. **Run on device**
   - Scan QR code with Expo Go app (Android/iOS)
   - Or press `i` for iOS simulator, `a` for Android emulator

## 🎮 How to Play

### Authentication
- Enter any valid phone number
- Use OTP: `123456` for testing

### Playing Games
1. Navigate to **Home** tab
2. Scroll to **Mini Games** section
3. Tap **Play Now** on any available game
4. Complete rounds to earn points
5. Wait for cooldown (5 minutes) before replaying

### Game Rules
- **Daily Limit**: Maximum 100 points per day from games
- **Cooldown**: 5-minute wait between games
- **High Scores**: Personal best tracked for each game
- **Streaks**: Math quiz rewards consecutive correct answers

## 🛠️ Development

### Project Structure
```
earn-pilot-app/
├── app/                    # App routing and screens
│   ├── (auth)/            # Authentication screens
│   ├── (tabs)/            # Main tab screens
│   └── _layout.tsx        # Root layout
├── components/            # Reusable components
│   └── games/            # Mini-game components
├── hooks/                # Custom hooks
├── stores/               # State management
└── services/             # API services
```

### Available Scripts
- `npm start` - Start Expo development server
- `npm run android` - Run on Android
- `npm run ios` - Run on iOS
- `npm run web` - Run on web browser

### Environment Setup
- Uses Expo SDK 52
- React Native 0.76
- TypeScript 5.6.2

## 🎯 Game Features

### Color Match Game
- 3 rounds of color matching
- 10-second time limit per round
- 10 points per correct answer

### Image Match Game  
- 3 rounds of emoji/image matching
- 8-second time limit per round
- 15 points per correct answer

### Math Quiz Game
- 5 rounds of arithmetic problems
- Progressive difficulty levels
- 5 base points + streak bonus (up to +5)
- 15-second time limit per problem

### Memory Pattern Game
- 5 rounds of sequence memorization
- 4-tile grid (Red, Teal, Blue, Green)
- Pattern length: 3-6 tiles
- 8 base points + difficulty bonus

## 🔧 Configuration

### Theme Customization
Themes are defined in `hooks/useTheme.ts` with full customization support for:
- Colors (primary, secondary, backgrounds)
- Gradients and borders
- Text colors and opacity
- Dark/light mode variants

### Game Settings
Game configuration in `hooks/useGameStore.ts`:
- Cooldown duration (5 minutes)
- Daily point limits (100 points)
- High score tracking
- Persistent storage

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

**Made with ❤️ using React Native + Expo**