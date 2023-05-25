<template>
  <header>
    <p>{{ title }}</p>
  </header>
</template>

<script>
export default {
  name: "TitleComponent",
  props: {
    title: {
      type: String,
      required: true,
    },
  },
};
</script>

<style lang="scss" scoped>
header {
  background-color: white;
  border-radius: var(--border-radius) var(--border-radius) 0 0;
  padding: 0.9rem;
  text-align: center;
  width: 100%;

  div {
    align-items: center;
    display: flex;
    flex-flow: row wrap;
    gap: 2rem;
    justify-content: center;

    #shutter {
      padding-left: 24px;

      span {
        position: relative;

        &::before,
        &::after {
          background-color: red;
          border-radius: 50%;
          content: "";
          height: 18px;
          left: -24px;
          position: absolute;
          width: 18px;
        }

        &::after {
          animation: pulse-scale 2.6s infinite;
        }

        @keyframes pulse-scale {
          0% {
            opacity: 0.7;
            transform: scale(1);
          }
          100% {
            opacity: 0;
            transform: scale(2.4);
          }
        }
      }
    }
  }
}

.green-border {
  animation: fade 3s ease-out forwards;
  box-shadow: inset 0 0 10px green;

  @keyframes fade {
    0% {
      box-shadow: inset 0 0 10px green;
    }
    50% {
      box-shadow: inset 0 0 10px green;
    }
    100% {
      box-shadow: inset 0 0 0 green;
    }
  }
}

.red-border {
  animation: pulse 3s linear infinite alternate;
  box-shadow: inset 0 0 10px red;

  @keyframes pulse {
    from {
      box-shadow: inset 0 0 10px red;
    }
    to {
      box-shadow: inset 0 0 0 red;
    }
  }
}
</style>
