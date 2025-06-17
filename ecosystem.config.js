module.exports = {
  apps: [
    {
      name: 'voicecoach-api',
      script: 'dist/index.js',
      instances: 1,
      env_file: '.env.production',
      env: { NODE_ENV: 'production' }
    }
  ]
};
