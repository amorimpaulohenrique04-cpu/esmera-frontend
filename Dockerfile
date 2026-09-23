FROM denoland/deno:alpine-1.46.3

# The port that the Fresh/Deco application listens to.
EXPOSE 8000

WORKDIR /app

RUN mkdir -p /home/deno \
    && chown -R deno:deno /home/deno \
    && mkdir /app/deno \
    && chown -R deno:deno /app \
    && mkdir -p /deno-dir \
    && chown -R deno:deno /deno-dir

# Prefer not to run as root.
USER deno

COPY --chown=deno:deno . deco

WORKDIR /app/deco

# Warm Fresh runtime dependencies during the image build so production can run cached-only.
RUN echo -e 'import "$fresh/src/build/deps.ts";\n import "$fresh/src/runtime/entrypoints/main.ts";\n import "$fresh/src/runtime/entrypoints/deserializer.ts";\n import "$fresh/src/runtime/entrypoints/signals.ts";' >> _docker_deps.ts

RUN deno cache --allow-scripts --frozen main.ts dev.ts _docker_deps.ts

ARG GIT_REVISION=1

ENV DECO_SITE_NAME=testeesmera
ENV DENO_DEPLOYMENT_ID=$GIT_REVISION

CMD ["run", "--cached-only", "-A", "--unstable-kv", "main.ts"]
