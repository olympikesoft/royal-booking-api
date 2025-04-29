import { Request, Response, NextFunction } from 'express';
import { ClassConstructor, plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { ApiError } from './error-handler.middleware';


/**
 * Generic middleware to validate a request against a DTO class
 * @param dtoClass The DTO class to validate against
 * @param source Where to find the data to validate (body, query, params)
 */
export function validateDto<T extends object>(
    dtoClass: new () => T,
    source: 'body' | 'query' | 'params' = 'body'
  ) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Get the data to validate based on the source
        const data = req[source];
        
        // Transform plain object to class instance
        const dtoObject = plainToInstance(dtoClass, data);
        
        // Validate the object
        const errors = await validate(dtoObject as object, { 
          whitelist: true,
          forbidNonWhitelisted: true
        });
        
        if (errors.length > 0) {
          const errorMessages = formatValidationErrors(errors);
          throw new ApiError(`Validation failed: ${JSON.stringify(errorMessages)}`, 400);
        }
        
        // Update request data with validated and transformed object
        req[source] = dtoObject;
        next();
      } catch (error) {
        if (error instanceof ApiError) {
          next(error);
        } else {
          next(new ApiError('Validation error', 400));
        }
      }
    };
  }

  
/**
 * Middleware to validate request body against a DTO class
 * @param type The DTO class to validate against
 * @param skipMissingProperties Whether to skip validation of missing properties (default: false)
 */
export function validateBody<T extends object>(
  type: ClassConstructor<T>,
  skipMissingProperties: boolean = false
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Transform plain object to class instance
      const dtoObj = plainToInstance(type, req.body);
      
      // Validate the object
      const errors: ValidationError[] = await validate(dtoObj, {
        skipMissingProperties,
        whitelist: true,
        forbidNonWhitelisted: true
      });
      
      if (errors.length > 0) {
        // Format validation errors
        const validationErrors = formatValidationErrors(errors);
        
        throw new ApiError(
          `Validation failed: ${JSON.stringify(validationErrors)}`,
          400
        );
      }
      
      // Update request body with validated and transformed object
      req.body = dtoObj;
      next();
    } catch (error) {
      if (error instanceof ApiError) {
        next(error);
      } else {
        next(new ApiError('Validation error', 400));
      }
    }
  };
}

/**
 * Middleware to validate request query against a DTO class
 * @param type The DTO class to validate against
 * @param skipMissingProperties Whether to skip validation of missing properties (default: true)
 */
export function validateQuery<T extends object>(
  type: ClassConstructor<T>,
  skipMissingProperties: boolean = true
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Transform plain object to class instance
      const dtoObj = plainToInstance(type, req.query);
      
      // Validate the object
      const errors: ValidationError[] = await validate(dtoObj, {
        skipMissingProperties,
        whitelist: true,
        forbidNonWhitelisted: true
      });
      
      if (errors.length > 0) {
        // Format validation errors
        const validationErrors = formatValidationErrors(errors);
        
        throw new ApiError(
          `Query validation failed: ${JSON.stringify(validationErrors)}`,
          400
        );
      }
      
      // Update request query with validated and transformed object
      req.query = dtoObj as any;
      next();
    } catch (error) {
      if (error instanceof ApiError) {
        next(error);
      } else {
        next(new ApiError('Query validation error', 400));
      }
    }
  };
}

/**
 * Middleware to validate request params against a DTO class
 * @param type The DTO class to validate against
 */
export function validateParams<T extends object>(type: ClassConstructor<T>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Transform plain object to class instance
      const dtoObj = plainToInstance(type, req.params);
      
      // Validate the object
      const errors: ValidationError[] = await validate(dtoObj, {
        skipMissingProperties: false,
        whitelist: true,
        forbidNonWhitelisted: true
      });
      
      if (errors.length > 0) {
        // Format validation errors
        const validationErrors = formatValidationErrors(errors);
        
        throw new ApiError(
          `Params validation failed: ${JSON.stringify(validationErrors)}`,
          400
        );
      }
      
      // Update request params with validated and transformed object
      req.params = dtoObj as any;
      next();
    } catch (error) {
      if (error instanceof ApiError) {
        next(error);
      } else {
        next(new ApiError('Params validation error', 400));
      }
    }
  };
}

/**
 * Format validation errors into a more readable object
 * @param errors Array of ValidationError objects
 * @returns Formatted error object
 */
function formatValidationErrors(errors: ValidationError[]): Record<string, string[]> {
  const formattedErrors: Record<string, string[]> = {};
  
  errors.forEach((error) => {
    const property = error.property;
    const constraints = error.constraints;
    
    if (constraints) {
      formattedErrors[property] = Object.values(constraints);
    }
    
    // Handle nested errors
    if (error.children && error.children.length > 0) {
      const nestedErrors = formatValidationErrors(error.children);
      
      Object.entries(nestedErrors).forEach(([nestedProp, messages]) => {
        formattedErrors[`${property}.${nestedProp}`] = messages;
      });
    }
  });
  
  return formattedErrors;
}