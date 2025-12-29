FROM node:24-alpine

# Create a non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

WORKDIR /app

# Set ownership of the working directory to nodejs user
RUN chown -R nodejs:nodejs /app

# Copy package files and change ownership
COPY --chown=nodejs:nodejs package.json package-lock.json ./

# Switch to non-root user before installing dependencies
USER nodejs

RUN npm install

COPY --chown=nodejs:nodejs . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
