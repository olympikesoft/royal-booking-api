import jwt, { JwtPayload } from 'jsonwebtoken'; // Import JwtPayload type explicitly
import { UserService } from './user.service';
import { config } from '../../config';
import ms from 'ms';

export interface TokenPayload {
  id: string;
  email: string;
  role: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export class AuthService {
  constructor(private userService: UserService) {}

  async login(email: string, password: string): Promise<LoginResponse | null> {
    const user = await this.userService.findByEmail(email);

    if (!user || !user.isActive) {
      // Combine checks and return null if user not found or inactive
      return null;
    }

    // Password comparison logic should be here!
    // Example (assuming user has a comparePassword method):
    // const isMatch = await user.comparePassword(password);
    // if (!isMatch) {
    //   return null; // Invalid password
    // }
    // ---- Placeholder: Assume password check happens ----


    const tokenPayload: TokenPayload = {
      id: user.id as string, // Assuming user.id might be something else like ObjectId initially
      email: user.email,
      role: user.role,
    };

    let expiresInSeconds: number;
    if (typeof config.jwt.expiresIn === 'string') {
        const milliseconds = ms(Number(config.jwt.expiresIn));
        if (milliseconds === undefined) {
             console.error(`Invalid JWT expiration string in config: ${config.jwt.expiresIn}`);
             expiresInSeconds = 3600;
        } else {
            expiresInSeconds = Math.floor(Number(milliseconds) / 1000);
        }
    } else {
        expiresInSeconds = config.jwt.expiresIn;
    }

    const token = jwt.sign(tokenPayload, config.jwt.secret, {
      expiresIn: expiresInSeconds
    });

    return {
      token,
      user: {
        id: user.id as string,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  verifyToken(token: string): TokenPayload | null {
    try {
      // verify returns JwtPayload | string based on the types when no options or complete:false
      const decoded = jwt.verify(token, config.jwt.secret);

      if (typeof decoded === 'object' && decoded !== null) {
        return decoded as TokenPayload;
      }

      console.error("JWT verification returned unexpected type:", typeof decoded);
      return null;

    } catch (error) {
      return null; 
    }
  }
}