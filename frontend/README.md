#  Play-Donate

Play-Donate is a full-stack golf-based rewards platform where users can track their Stableford scores, participate in monthly prize draws, win prizes based on the number of matched numbers, and support charities through donations.

The application also includes subscription management, winner verification, payment processing, charity management, and an admin dashboard.


##  Live Demo

### Frontend
https://play-donate.vercel.app

### Backend
https://play-donate-zb4x.onrender.com

### GitHub Repository
https://github.com/raghunathr1/Play-Donate


##  Features

###  User Features

- User Signup and Login
- JWT-based Authentication
- Protected User Dashboard
- User Profile
- Subscription Management
- Monthly Stableford Score Entry
- View Previous Scores
- Monthly Prize Draws
- View Draw Results
- View Winnings
- Winner Verification Status
- Winner Proof Upload
- Charity Listing
- Charity Donations
- Stripe Payment Integration


##  Draw System

The application includes a monthly number draw system.

- Monthly draws
- Random number generation
- Score-based weighted number selection
- Match 3, Match 4 and Match 5 prize categories
- Prize pool calculation
- Prize distribution
- Jackpot rollover
- Draw result calculation
- Published draw results


##  Payments

Stripe is used for payment processing.

Supported payment functionality includes:

- Monthly subscription
- Yearly subscription
- Charity donations
- Stripe Checkout
- Stripe Webhooks
- Subscription status updates
- Donation payment status updates


##  Winner Management

Users who win a draw can submit proof for verification.

Admin can:

- View winners
- Review submitted proof
- Verify winners
- Approve winnings
- Mark winnings as paid

Cloudinary is used for winner proof image storage.


##  Admin Dashboard

Admin features include:

- Admin Dashboard
- User Management
- Draw Management
- Charity Management
- Winner Management
- Reports
- Draw creation
- Draw publishing
- Result calculation
- Winner verification
- Payment status management


##  Tech Stack

### Frontend

- React
- Vite
- React Router
- CSS
- JavaScript
- Fetch API

### Backend

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT
- bcryptjs
- Stripe
- Cloudinary
- Multer
- CORS
- dotenv

### Deployment

- Frontend: Vercel
- Backend: Render
- Database: MongoDB Atlas
- Image Storage: Cloudinary
- Payments: Stripe


